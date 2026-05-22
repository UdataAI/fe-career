import React, { useState, useEffect } from 'react';
import jdsData from './data/jds.json';

const USE_MAILTO_FOR_APPLY = import.meta.env.VITE_USE_MAILTO_FOR_APPLY !== 'false';
const HR_EMAIL = import.meta.env.VITE_HR_EMAIL || 'hr@udata.ai';

function App() {
  const [jobs, setJobs] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [selectedJob, setSelectedJob] = useState(null);
  const [isApplyMode, setIsApplyMode] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    cvFile: null,
    coverLetter: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Initialize jobs
  useEffect(() => {
    setJobs(jdsData);
  }, []);

  // Handle header background on scroll
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Get categories dynamically
  const categories = ['Tất cả', ...new Set(jdsData.map(job => job.category))];

  // Filtered jobs
  const filteredJobs = selectedCategory === 'Tất cả' 
    ? jobs 
    : jobs.filter(job => job.category === selectedCategory);

  const handleApplyClick = (job) => {
    if (USE_MAILTO_FOR_APPLY) {
      const hrEmail = HR_EMAIL;
      const subject = `[Udata Careers] Ứng tuyển vị trí ${job.title}`;
      const body = `Kính gửi bộ phận Tuyển dụng Udata,\n\nTôi muốn ứng tuyển vào vị trí ${job.title}.\n\nDưới đây là thông tin cá nhân của tôi:\n- Họ và tên: [Vui lòng nhập họ tên của bạn]\n- Số điện thoại: [Vui lòng nhập số điện thoại]\n- Link Portfolio/CV (nếu có): \n\n(Vui lòng đính kèm file CV của bạn vào email này trước khi gửi)\n\nTrân trọng,\n`;
      
      window.location.href = `mailto:${hrEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } else {
      setSelectedJob(job);
      setIsApplyMode(true);
      setFormSubmitted(false);
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        cvFile: null,
        coverLetter: '',
      });
      setFormErrors({});
    }
  };

  const handleViewDetailClick = (job) => {
    if (job.filename) {
      window.open(`/JD/${encodeURIComponent(job.filename)}`, '_blank');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFormData(prev => ({ ...prev, cvFile: file }));
    if (formErrors.cvFile) {
      setFormErrors(prev => ({ ...prev, cvFile: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.fullName.trim()) errors.fullName = 'Vui lòng nhập họ và tên';
    if (!formData.email.trim()) {
      errors.email = 'Vui lòng nhập email';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email không hợp lệ';
    }
    if (!formData.phone.trim()) {
      errors.phone = 'Vui lòng nhập số điện thoại';
    } else if (!/^[0-9]{10,11}$/.test(formData.phone.replace(/[\s.-]/g, ''))) {
      errors.phone = 'Số điện thoại không hợp lệ';
    }
    if (!formData.cvFile) errors.cvFile = 'Vui lòng tải lên CV của bạn';
    return errors;
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // Simulate API call
    console.log('Submitting application:', {
      job: selectedJob ? selectedJob.title : 'Free Application',
      ...formData
    });

    setFormSubmitted(true);
  };

  // Helper for rendering category icon
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Sales':
        return 'payments';
      case 'Marketing':
        return 'campaign';
      case 'Backoffice':
        return 'manage_accounts';
      default:
        return 'terminal';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      
      {/* Header */}
      <header className={`fixed top-0 w-full z-40 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/90 backdrop-blur-xl border-b border-slate-200/50 shadow-sm shadow-primary/5 py-3' 
          : 'bg-transparent py-5'
      }`}>
        <div className="flex justify-between items-center max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex items-center gap-3">
            <img 
              alt="Udata Logo" 
              className="h-10 w-auto rounded" 
              src="/logoandfavi/logo_1.png"
            />
            <span className="font-semibold text-xl tracking-tight text-primary font-display-lg">
              Careers
            </span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#" className="font-medium text-slate-600 hover:text-primary transition-colors">Sản phẩm</a>
            <a href="#" className="font-medium text-slate-600 hover:text-primary transition-colors">Giải pháp</a>
            <a href="#" className="font-medium text-slate-600 hover:text-primary transition-colors">Về chúng tôi</a>
            <a href="#openings" className="font-bold text-primary border-b-2 border-primary pb-1">Tuyển dụng</a>
          </nav>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => handleApplyClick({ title: 'Gửi CV Tự do', category: 'Khác' })}
              className="electric-gradient-bg text-white px-5 py-2 rounded-full font-medium active:scale-95 transition-all hover:opacity-90 shadow-md shadow-primary/20"
            >
              Liên hệ
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20">
        
        {/* Hero Section */}
        <section className="relative min-h-[80vh] flex items-center overflow-hidden py-16">
          <div className="absolute inset-0 z-0">
            <img 
              className="w-full h-full object-cover opacity-85" 
              alt="Office background"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCCZuYZ_ZIoNbNLuZw0Yte3PX4V7PsW_5XVjQu6Y-Fmg07vxE89jqA0tdBSx_i94yquW5_RPGrqUGTO-i_8dgd85v_BYxEI3chrgD7c3t-Keh_d-dDAUTiL4yGOYd0QCNkE2R74uNi_yctZCtq6CSrnBVUBQX-I_-coK16yJeoSX26SKUcm7-Z2PS4ocGQ3WlT-6KVFqaQcg9fK4Pgoqq7fSiGxrW7Zpp2Cbc3QsKTCfwkxY92r_Yh42ve-JcHdSBSu_2IYUjUiFmE"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-50 via-slate-50/90 to-transparent"></div>
          </div>
          
          <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 w-full">
            <div className="max-w-2xl space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary font-mono text-xs uppercase tracking-wider font-semibold">
                <span className="pulse-node w-2.5 h-2.5 rounded-full bg-primary"></span>
                Đang tuyển dụng
              </div>
              <h1 className="font-display-lg text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight">
                Gia nhập đội ngũ kiến tạo tương lai <span className="gradient-text">AI &amp; IoT</span>
              </h1>
              <p className="font-body-lg text-lg text-slate-600 leading-relaxed max-w-xl">
                UDATA đang tìm kiếm những nhân sự trẻ, chủ động và sẵn sàng phát triển trong môi trường công nghệ thực chiến.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <a 
                  href="#openings" 
                  className="electric-gradient-bg text-white px-8 py-4 rounded-xl font-bold hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center gap-2"
                >
                  Xem các vị trí trống
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Why Udata Section: Bento Grid */}
        <section className="py-28 bg-white transition-colors duration-300" id="why-udata">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="font-display-lg text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Tại sao chọn Udata?
              </h2>
              <p className="text-slate-500 text-lg">
                Chúng tôi không chỉ xây dựng phần mềm, chúng tôi định hình cách doanh nghiệp tương tác với dữ liệu.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Value Card 1 */}
              <div className="glass-panel p-10 rounded-2xl soft-shadow hover:-translate-y-2 transition-all duration-300">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-8">
                  <span className="material-symbols-outlined text-3xl font-light">psychology</span>
                </div>
                <h3 className="font-display-lg text-xl font-bold mb-4 text-slate-900">
                  Môi trường Công nghệ Thực chiến
                </h3>
                <p className="text-slate-500 leading-relaxed text-sm">
                  Tham gia trực tiếp vào các dự án AI, AIoT, Smart Factory và Chuyển đổi số cho doanh nghiệp sản xuất.
                </p>
              </div>
              
              {/* Value Card 2 */}
              <div className="glass-panel p-10 rounded-2xl soft-shadow hover:-translate-y-2 transition-all duration-300 border-t-4 border-t-primary">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-8">
                  <span className="material-symbols-outlined text-3xl font-light">trending_up</span>
                </div>
                <h3 className="font-display-lg text-xl font-bold mb-4 text-slate-900">
                  Tăng tốc Sự nghiệp trong Kỷ nguyên AI
                </h3>
                <p className="text-slate-500 leading-relaxed text-sm">
                  Làm việc cùng đội ngũ công nghệ tốc độ cao, phát triển tư duy solution và kỹ năng thực chiến B2B.
                </p>
              </div>
              
              {/* Value Card 3 */}
              <div className="glass-panel p-10 rounded-2xl soft-shadow hover:-translate-y-2 transition-all duration-300">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-8">
                  <span className="material-symbols-outlined text-3xl font-light">public</span>
                </div>
                <h3 className="font-display-lg text-xl font-bold mb-4 text-slate-900">
                  Tạo ra Giá trị cho Doanh nghiệp Thực
                </h3>
                <p className="text-slate-500 leading-relaxed text-sm">
                  Các giải pháp của bạn giúp doanh nghiệp tối ưu vận hành, nâng cao hiệu suất sử dụng dữ liệu và phát triển bền vững.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Current Openings */}
        <section className="py-28 bg-slate-50 transition-colors duration-300" id="openings">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-16 gap-6">
              <div className="max-w-xl">
                <h2 className="font-display-lg text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                  Vị trí đang tuyển
                </h2>
                <p className="text-slate-500 text-lg">
                  Tìm thấy vị trí phù hợp với thế mạnh của bạn và bắt đầu hành trình tại Udata ngay hôm nay.
                </p>
              </div>
              
              {/* Dynamic Filter Badges */}
              <div className="flex flex-wrap gap-2.5">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all cursor-pointer border ${
                      selectedCategory === category
                        ? 'bg-primary border-primary text-white shadow-md shadow-primary/10'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {category === 'Sales' ? 'Kinh doanh' : category === 'Backoffice' ? 'Văn phòng' : category}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Jobs List */}
            <div className="grid grid-cols-1 gap-4">
              {filteredJobs.length > 0 ? (
                filteredJobs.map(job => (
                  <div 
                    key={job.id}
                    className="bg-white p-6 md:p-8 rounded-2xl border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group"
                  >
                    <div className="flex gap-6 items-center w-full md:w-auto">
                      <div className="w-14 h-14 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                        <span className="material-symbols-outlined text-2xl">
                          {getCategoryIcon(job.category)}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-display-lg text-lg md:text-xl font-bold text-slate-900 mb-2 group-hover:text-primary transition-colors">
                          {job.title}
                        </h4>
                        <div className="flex flex-wrap gap-x-6 gap-y-2">
                          <span className="flex items-center gap-1.5 text-slate-400 text-sm">
                            <span className="material-symbols-outlined text-lg">category</span>
                            {job.category === 'Sales' ? 'Kinh doanh' : job.category === 'Backoffice' ? 'Văn phòng' : job.category}
                          </span>
                          <span className="flex items-center gap-1.5 text-slate-400 text-sm">
                            <span className="material-symbols-outlined text-lg">location_on</span>
                            {job.location}
                          </span>
                          <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded">
                            {job.type}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
                      <button
                        onClick={() => handleViewDetailClick(job)}
                        className="flex-1 md:flex-initial border border-slate-200 hover:border-primary/40 text-slate-700 px-6 py-3.5 rounded-xl font-semibold hover:bg-slate-50 transition-all text-center cursor-pointer flex items-center gap-2 justify-center"
                      >
                        <span className="material-symbols-outlined text-lg">open_in_new</span>
                        Xem chi tiết
                      </button>
                      <button 
                        onClick={() => handleApplyClick(job)}
                        className="flex-1 md:flex-initial bg-primary hover:bg-primary/90 text-white px-6 py-3.5 rounded-xl font-semibold active:scale-95 transition-all shadow-md shadow-primary/10"
                      >
                        Ứng tuyển ngay
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-500">
                  Không tìm thấy vị trí tuyển dụng phù hợp.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Recruitment Process */}
        <section className="py-28 bg-white transition-colors duration-300 overflow-hidden" id="process">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="font-display-lg text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Quy trình tuyển dụng
              </h2>
              <p className="text-slate-500 text-lg">
                Công bằng, minh bạch và nhanh chóng là cam kết của chúng tôi trong quy trình tuyển dụng.
              </p>
            </div>
            
            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12">
              {/* Connector line (Desktop) */}
              <div className="hidden md:block absolute top-16 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-primary/10 via-primary to-primary/10"></div>
              
              {/* Step 1 */}
              <div className="relative flex flex-col items-center text-center group">
                <div className="w-28 h-28 rounded-full glass-panel flex items-center justify-center mb-6 relative z-10 border-4 border-white shadow-xl transition-all duration-300 group-hover:scale-105 group-hover:border-primary/20">
                  <span className="material-symbols-outlined text-4xl text-primary font-light">edit_document</span>
                  <div className="absolute -top-1 -right-1 w-9 h-9 rounded-full electric-gradient-bg text-white flex items-center justify-center font-bold text-base shadow">
                    1
                  </div>
                </div>
                <h3 className="font-display-lg text-xl font-bold mb-3 text-slate-900">Ứng tuyển</h3>
                <p className="text-slate-500 max-w-xs text-sm">
                  Gửi CV và portfolio ấn tượng nhất của bạn cho đội ngũ Talent Acquisition.
                </p>
              </div>
              
              {/* Step 2 */}
              <div className="relative flex flex-col items-center text-center group">
                <div className="w-28 h-28 rounded-full glass-panel flex items-center justify-center mb-6 relative z-10 border-4 border-white shadow-xl transition-all duration-300 group-hover:scale-105 group-hover:border-primary/20">
                  <span className="material-symbols-outlined text-4xl text-primary font-light">diversity_3</span>
                  <div className="absolute -top-1 -right-1 w-9 h-9 rounded-full electric-gradient-bg text-white flex items-center justify-center font-bold text-base shadow">
                    2
                  </div>
                </div>
                <h3 className="font-display-lg text-xl font-bold mb-3 text-slate-900">Phỏng vấn</h3>
                <p className="text-slate-500 max-w-xs text-sm">
                  Trao đổi trực tiếp về kỹ năng chuyên môn và sự phù hợp về văn hóa với đội ngũ lãnh đạo.
                </p>
              </div>
              
              {/* Step 3 */}
              <div className="relative flex flex-col items-center text-center group">
                <div className="w-28 h-28 rounded-full glass-panel flex items-center justify-center mb-6 relative z-10 border-4 border-white shadow-xl transition-all duration-300 group-hover:scale-105 group-hover:border-primary/20">
                  <span className="material-symbols-outlined text-4xl text-primary font-light">verified</span>
                  <div className="absolute -top-1 -right-1 w-9 h-9 rounded-full electric-gradient-bg text-white flex items-center justify-center font-bold text-base shadow">
                    3
                  </div>
                </div>
                <h3 className="font-display-lg text-xl font-bold mb-3 text-slate-900">Nhận Offer</h3>
                <p className="text-slate-500 max-w-xs text-sm">
                  Chào mừng bạn gia nhập đại gia đình Udata để cùng nhau chinh phục những đỉnh cao mới.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-6 md:px-12">
          <div className="max-w-7xl mx-auto rounded-3xl electric-gradient-bg p-12 text-center text-white relative overflow-hidden shadow-xl shadow-primary/20">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3"></div>

            <div className="relative z-10">
              <h2 className="font-display-lg text-3xl md:text-4xl font-extrabold mb-6 leading-tight">
                Chưa thấy vị trí phù hợp?
              </h2>
              <p className="text-lg mb-8 max-w-2xl mx-auto text-sky-50 opacity-90 leading-relaxed">
                Đừng ngần ngại gửi CV của bạn cho chúng tôi. Chúng tôi luôn sẵn lòng chào đón những nhân tài khao khát cống hiến.
              </p>
              <button 
                onClick={() => handleApplyClick({ title: 'Gửi CV Tự do', category: 'Khác' })}
                className="bg-white text-primary hover:bg-slate-50 px-10 py-4 rounded-xl font-bold transition-all flex items-center gap-2.5 mx-auto active:scale-95 shadow-lg"
              >
                Gửi CV Tự do
                <span className="material-symbols-outlined text-lg">send</span>
              </button>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="w-full py-16 bg-white border-t border-slate-200/60 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-4 gap-12">
          
          <div className="space-y-6 col-span-1 md:col-span-1">
            <img 
              alt="Udata Logo" 
              className="h-10 w-auto rounded" 
              src="/logoandfavi/logo_1.png"
            />
            <p className="text-slate-400 text-sm leading-relaxed">
              © 2026 Udata. Precise, Visionary, Dependable AI &amp; IoT Solutions.
            </p>
          </div>
          
          <div className="col-span-1">
            <h4 className="font-bold text-slate-800 mb-6 text-sm uppercase tracking-wider">Sản phẩm</h4>
            <ul className="space-y-4">
              <li><a className="text-slate-600 hover:text-primary transition-colors text-sm" href="#">Uboard</a></li>
              <li><a className="text-slate-600 hover:text-primary transition-colors text-sm" href="#">Ugate</a></li>
              <li><a className="text-slate-600 hover:text-primary transition-colors text-sm" href="#">Uzero</a></li>
              <li><a className="text-slate-600 hover:text-primary transition-colors text-sm" href="#">MiniUgate</a></li>
            </ul>
          </div>
          
          <div className="col-span-1 md:col-span-2 space-y-6">
            <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Thông tin liên hệ</h4>
            
            {/* Social Icons Row */}
            <div className="flex gap-3.5 items-center">
              {/* Phone Button */}
              <a 
                href="tel:1800255698" 
                className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 flex items-center justify-center hover:scale-105 transition-all shadow-sm bg-white"
              >
                <img src="/social/phone.png" alt="Phone" className="w-6 h-6 object-contain" />
              </a>
              {/* Facebook Button */}
              <a 
                href="https://www.facebook.com/profile.php?id=61566884154567" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 flex items-center justify-center hover:scale-105 transition-all shadow-sm bg-white"
              >
                <img src="/social/facebook.webp" alt="Facebook" className="w-full h-full object-cover" />
              </a>
              {/* LinkedIn Button */}
              <a 
                href="https://www.linkedin.com/company/udatajsc/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 flex items-center justify-center hover:scale-105 transition-all shadow-sm bg-white"
              >
                <img src="/social/linkedin.webp" alt="LinkedIn" className="w-full h-full object-cover" />
              </a>
              {/* Instagram Button */}
              <a 
                href="https://www.instagram.com/udata_jsc/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 flex items-center justify-center hover:scale-105 transition-all shadow-sm bg-white"
              >
                <img src="/social/instagram.webp" alt="Instagram" className="w-full h-full object-cover" />
              </a>
            </div>

            {/* Details list */}
            <ul className="space-y-4">
              {/* Hotline */}
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-primary fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M6.62 10.79a15.15 15.15 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.27c1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.27 1.11l-2.2 2.2z"/>
                </svg>
                <a className="text-slate-600 hover:text-primary transition-colors text-sm font-medium" href="tel:1800255698">1800 255 698</a>
              </li>

              {/* Support Email */}
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-primary fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                <a className="text-slate-600 hover:text-primary transition-colors text-sm font-medium" href="mailto:hr@udata.ai">hr@udata.ai</a>
              </li>

              {/* Sales Email */}
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-primary fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                <a className="text-slate-600 hover:text-primary transition-colors text-sm font-medium" href="mailto:sales@udata.ai">sales@udata.ai</a>
              </li>

              {/* Hanoi Office */}
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-primary fill-current shrink-0 mt-1" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                <div className="text-sm text-slate-600 leading-relaxed">
                  <span className="font-semibold text-slate-800">Văn phòng Hà Nội:</span>
                  <br />
                  Tầng 9, Tòa nhà Thiên Niên Kỷ, Số 4 Quang Trung, Phường Hà Đông, Hà Nội.
                </div>
              </li>

              {/* HCM Office */}
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-primary fill-current shrink-0 mt-1" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                <div className="text-sm text-slate-600 leading-relaxed">
                  <span className="font-semibold text-slate-800">Văn phòng Hồ Chí Minh:</span>
                  <br />
                  Tầng 6, Tòa nhà DHG, Số 31–33, Đường 18, Phường Thông Tây Hội, Thành phố Hồ Chí Minh.
                </div>
              </li>
            </ul>
          </div>
          
        </div>
      </footer>

      {/* Detail & Apply Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="relative bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-slate-100">
            
            {/* Modal Header */}
            <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded mb-2 inline-block">
                  {selectedJob.category === 'Sales' ? 'Kinh doanh' : selectedJob.category === 'Backoffice' ? 'Văn phòng' : selectedJob.category}
                </span>
                <h3 className="font-display-lg text-2xl font-bold text-slate-900">
                  {selectedJob.title}
                </h3>
                <div className="flex flex-wrap gap-4 mt-2 text-slate-500 text-sm">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-lg">location_on</span>
                    {selectedJob.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-lg">schedule</span>
                    {selectedJob.type}
                  </span>
                </div>
              </div>
              
              <button 
                onClick={() => setSelectedJob(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-8">
              {!isApplyMode ? (
                // JD View
                <>
                  {/* About Section */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                      <span className="w-1.5 h-6 rounded bg-primary inline-block"></span>
                      Về Udata
                    </h4>
                    <p className="text-slate-600 leading-relaxed text-sm">
                      {selectedJob.about}
                    </p>
                  </div>

                  {/* Duties Section */}
                  {selectedJob.duties && selectedJob.duties.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                        <span className="w-1.5 h-6 rounded bg-primary inline-block"></span>
                        Mô tả công việc
                      </h4>
                      <ul className="space-y-2.5">
                        {selectedJob.duties.map((duty, idx) => (
                          <li key={idx} className="flex gap-2.5 text-slate-600 text-sm leading-relaxed">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{duty}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Requirements Section */}
                  {selectedJob.requirements && selectedJob.requirements.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                        <span className="w-1.5 h-6 rounded bg-primary inline-block"></span>
                        Yêu cầu ứng viên
                      </h4>
                      <ul className="space-y-2.5">
                        {selectedJob.requirements.map((req, idx) => (
                          <li key={idx} className="flex gap-2.5 text-slate-600 text-sm leading-relaxed">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Benefits Section */}
                  {selectedJob.benefits && selectedJob.benefits.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                        <span className="w-1.5 h-6 rounded bg-primary inline-block"></span>
                        Quyền lợi được hưởng
                      </h4>
                      <ul className="space-y-2.5">
                        {selectedJob.benefits.map((benefit, idx) => (
                          <li key={idx} className="flex gap-2.5 text-slate-600 text-sm leading-relaxed">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Location & Time */}
                  {selectedJob.locationAndTime && (
                    <div className="space-y-3 p-4 rounded-xl bg-slate-50">
                      <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-lg text-primary">location_on</span>
                        Địa điểm &amp; Thời gian làm việc
                      </h4>
                      <div className="text-slate-600 text-xs leading-relaxed whitespace-pre-line">
                        {selectedJob.locationAndTime}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                // Application Form View
                <div className="space-y-6">
                  {formSubmitted ? (
                    // Success View
                    <div className="text-center py-10 space-y-4">
                      <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-500 flex items-center justify-center mx-auto shadow-md">
                        <span className="material-symbols-outlined text-4xl">check_circle</span>
                      </div>
                      <h4 className="font-display-lg text-2xl font-bold text-slate-900">
                        Nộp hồ sơ thành công!
                      </h4>
                      <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">
                        Cảm ơn bạn đã ứng tuyển vào vị trí <strong>{selectedJob.title}</strong>. Chúng tôi sẽ phản hồi lại bạn sớm nhất có thể.
                      </p>
                      <button
                        onClick={() => setSelectedJob(null)}
                        className="bg-primary hover:bg-primary/95 text-white px-6 py-2.5 rounded-xl font-semibold mt-4 transition-all"
                      >
                        Đóng
                      </button>
                    </div>
                  ) : (
                    // Input Form
                    <form onSubmit={handleFormSubmit} className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Full name */}
                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-slate-700">
                            Họ và tên <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleInputChange}
                            placeholder="Nguyễn Văn A"
                            className={`w-full px-4 py-3 rounded-xl border bg-slate-50 text-sm focus:outline-none focus:ring-2 ${
                              formErrors.fullName 
                                ? 'border-red-500 focus:ring-red-200' 
                                : 'border-slate-200 focus:ring-primary/20 focus:border-primary'
                            }`}
                          />
                          {formErrors.fullName && (
                            <p className="text-xs text-red-500 font-medium">{formErrors.fullName}</p>
                          )}
                        </div>

                        {/* Phone */}
                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-slate-700">
                            Số điện thoại <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            placeholder="09XXXXXXXX"
                            className={`w-full px-4 py-3 rounded-xl border bg-slate-50 text-sm focus:outline-none focus:ring-2 ${
                              formErrors.phone 
                                ? 'border-red-500 focus:ring-red-200' 
                                : 'border-slate-200 focus:ring-primary/20 focus:border-primary'
                            }`}
                          />
                          {formErrors.phone && (
                            <p className="text-xs text-red-500 font-medium">{formErrors.phone}</p>
                          )}
                        </div>
                      </div>

                      {/* Email */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">
                          Địa chỉ Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="email@example.com"
                          className={`w-full px-4 py-3 rounded-xl border bg-slate-50 text-sm focus:outline-none focus:ring-2 ${
                            formErrors.email 
                              ? 'border-red-500 focus:ring-red-200' 
                              : 'border-slate-200 focus:ring-primary/20 focus:border-primary'
                          }`}
                        />
                        {formErrors.email && (
                          <p className="text-xs text-red-500 font-medium">{formErrors.email}</p>
                        )}
                      </div>

                      {/* CV Upload */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">
                          Tải lên CV (PDF, DOCX) <span className="text-red-500">*</span>
                        </label>
                        <div className={`border-2 border-dashed rounded-xl p-6 text-center hover:bg-slate-50 transition-colors ${
                          formErrors.cvFile ? 'border-red-400 bg-red-50/20' : 'border-slate-200'
                        }`}>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={handleFileChange}
                            className="hidden"
                            id="cv-upload-input"
                          />
                          <label htmlFor="cv-upload-input" className="cursor-pointer space-y-2 block">
                            <span className="material-symbols-outlined text-4xl text-slate-400">
                              cloud_upload
                            </span>
                            <div className="text-sm text-slate-600">
                              {formData.cvFile ? (
                                <span className="font-semibold text-primary">
                                  {formData.cvFile.name}
                                </span>
                              ) : (
                                <>
                                  <span className="font-semibold text-primary">Chọn file CV</span> hoặc kéo thả vào đây
                                </>
                              )}
                            </div>
                            <p className="text-xs text-slate-400">PDF hoặc Word dưới 10MB</p>
                          </label>
                        </div>
                        {formErrors.cvFile && (
                          <p className="text-xs text-red-500 font-medium">{formErrors.cvFile}</p>
                        )}
                      </div>

                      {/* Cover Letter */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">
                          Thư giới thiệu (Không bắt buộc)
                        </label>
                        <textarea
                          name="coverLetter"
                          value={formData.coverLetter}
                          onChange={handleInputChange}
                          rows="4"
                          placeholder="Giới thiệu bản thân và lý do bạn muốn gia nhập Udata..."
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        ></textarea>
                      </div>

                      {/* Submit */}
                      <div className="flex gap-3 justify-end pt-4">
                        <button
                          type="button"
                          onClick={() => setIsApplyMode(false)}
                          className="px-6 py-3 border border-slate-200 rounded-xl text-slate-700 text-sm font-semibold hover:bg-slate-50"
                        >
                          Quay lại
                        </button>
                        <button
                          type="submit"
                          className="electric-gradient-bg text-white px-8 py-3 rounded-xl text-sm font-bold active:scale-95 transition-all shadow-md shadow-primary/20"
                        >
                          Nộp hồ sơ
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer (only visible in JD View) */}
            {!isApplyMode && (
              <div className="p-6 md:p-8 border-t border-slate-100 bg-slate-50 flex gap-4 justify-end">
                <button 
                  onClick={() => setSelectedJob(null)}
                  className="px-6 py-3.5 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-100 transition-colors"
                >
                  Đóng
                </button>
                <button 
                  onClick={() => {
                    if (USE_MAILTO_FOR_APPLY) {
                      handleApplyClick(selectedJob);
                    } else {
                      setIsApplyMode(true);
                    }
                  }}
                  className="bg-primary hover:bg-primary/95 text-white px-8 py-3.5 rounded-xl font-bold active:scale-95 transition-all shadow-md shadow-primary/10"
                >
                  Ứng tuyển ngay
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

export default App;
