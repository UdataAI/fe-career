import { useState, useEffect, useRef, useCallback } from 'react';
import sametelJobs from './data/sametel_jobs.json';
import { trackPageView, trackFormSubmission, updateApplicationEmailStatus } from './utils/tracker';

const HR_EMAIL = import.meta.env.VITE_HR_EMAIL || 'hr@onesphere.co';
const JOB_QUERY_PARAM = 'job';

const getJobFromCurrentUrl = () => {
  if (typeof window === 'undefined') return null;
  const jobId = new URL(window.location.href).searchParams.get(JOB_QUERY_PARAM);
  return sametelJobs.find(job => job.id === jobId) || null;
};

const updateJobUrl = (jobId, mode = 'pushState') => {
  const url = new URL(window.location.href);
  if (jobId) url.searchParams.set(JOB_QUERY_PARAM, jobId);
  else url.searchParams.delete(JOB_QUERY_PARAM);
  window.history[mode]({}, '', url);
};

const PILLARS = [
  { icon: 'factory', title: 'Phân phối công nghiệp', text: 'Phát triển mạng lưới phân phối, cung cấp sản phẩm và giải pháp công nghiệp cho doanh nghiệp sản xuất.' },
  { icon: 'solar_power', title: 'Giải pháp năng lượng mặt trời (EPC/C&I)', text: 'Triển khai giải pháp solar cho khách hàng thương mại và công nghiệp, từ thiết kế đến thực hiện dự án.' },
  { icon: 'storefront', title: 'Chuỗi bán lẻ năng lượng mặt trời', text: 'Đưa thiết bị và giải pháp solar (Solar - Inverter - Bess) đến gần hơn với khách hàng qua mạng lưới bán lẻ.' },
];

const STATS = [
  { value: 'Từ 2006', text: 'Gần 20 năm kinh nghiệm phát triển' },
  { value: '13.000 m²', text: 'Nhà máy tại KCN Long Thành, Đồng Nai' },
  { value: 'Hàng trăm dự án Solar', text: 'Từ vài trăm kWp đến trên 2 MWp' },
];

const CULTURE = [
  { title: 'Tinh thần doanh nhân', text: 'Chủ động nhìn thấy cơ hội, phát triển và nhận kết quả.' },
  { title: 'Trao quyền tự chủ', text: 'Có không gian quyết định và phát huy thế mạnh riêng.' },
  { title: 'Học từ thực tiễn', text: 'Cùng giải bài toán thị trường công nghiệp, dự án năng lượng và bán lẻ.' },
  { title: 'Phát triển bền vững', text: 'Ưu tiên giá trị dài hạn, hợp tác có trách nhiệm.' },
];

function App() {
  const [selectedJobId, setSelectedJobId] = useState(sametelJobs[0]?.id || '');
  const [activeModalJob, setActiveModalJob] = useState(getJobFromCurrentUrl);
  const formRef = useRef(null);

  const handleCloseJdModal = useCallback(() => {
    setActiveModalJob(null);
    updateJobUrl(null, 'replaceState');
  }, []);

  // Auto track page visit on load
  useEffect(() => {
    trackPageView();
  }, []);

  // Open the linked job on first load and keep modal state in sync with Back/Forward.
  useEffect(() => {
    const syncModalWithUrl = () => setActiveModalJob(getJobFromCurrentUrl());
    window.addEventListener('popstate', syncModalWithUrl);
    return () => window.removeEventListener('popstate', syncModalWithUrl);
  }, []);

  // Prevent background scrolling when JD Modal is open
  useEffect(() => {
    if (activeModalJob) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [activeModalJob]);

  // Track both card clicks and visits opened directly from a shared job URL.
  useEffect(() => {
    if (activeModalJob && typeof window.fbq === 'function') {
      window.fbq('trackCustom', 'ViewJobDetails', {
        job_title: activeModalJob.title,
        job_code: activeModalJob.code,
        content_name: activeModalJob.title
      });
    }
  }, [activeModalJob]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleCloseJdModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCloseJdModal]);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    position: sametelJobs[0]?.title || '',
    location: sametelJobs[0]?.locations?.[0] || 'Hà Nội',
    cvFile: null,
    coverLetter: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Header scroll detection
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle CTA click from job cards or hero
  const handleSelectJobAndScroll = (jobTitle, jobId, location = 'Hà Nội') => {
    setSelectedJobId(jobId);
    setFormData(prev => ({
      ...prev,
      position: jobTitle,
      location: location
    }));
    if (activeModalJob) {
      handleCloseJdModal();
    }
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleOpenJdModal = (job) => {
    setActiveModalJob(job);
    const currentJobId = new URL(window.location.href).searchParams.get(JOB_QUERY_PARAM);
    if (currentJobId !== job.id) updateJobUrl(job.id);
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
    if (file) {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        setFormErrors(prev => ({ ...prev, cvFile: 'Vui lòng chỉ tải lên file CV định dạng PDF (.pdf)' }));
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setFormErrors(prev => ({ ...prev, cvFile: 'Dung lượng file tối đa là 10MB' }));
        return;
      }
      setFormData(prev => ({ ...prev, cvFile: file }));
      if (formErrors.cvFile) {
        setFormErrors(prev => ({ ...prev, cvFile: '' }));
      }
    }
  };

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setFormData(prev => ({ ...prev, cvFile: null }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.fullName.trim()) errors.fullName = 'Vui lòng nhập họ và tên';
    
    if (!formData.phone.trim()) {
      errors.phone = 'Vui lòng nhập số điện thoại';
    } else if (!/^[0-9]{10,11}$/.test(formData.phone.replace(/[\s.-]/g, ''))) {
      errors.phone = 'Số điện thoại không hợp lệ (10-11 chữ số)';
    }

    if (formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Địa chỉ email không hợp lệ';
    }

    if (!formData.position) {
      errors.position = 'Vui lòng chọn vị trí ứng tuyển';
    }

    if (!formData.location) {
      errors.location = 'Vui lòng chọn khu vực làm việc';
    }

    if (!formData.cvFile) {
      errors.cvFile = 'Vui lòng tải lên file CV định dạng PDF';
    }

    return errors;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    try {
      const submission = await trackFormSubmission(formData);

      // Giữ tương thích với deployment cũ trong lúc chuyển sang MailApp.
      // Lỗi email không được làm thất bại hồ sơ đã xác nhận lưu.
      if (submission.emailProvider !== 'apps-script') {
        try {
          const emailPayload = new FormData();
          emailPayload.append('Mã hồ sơ', submission.applicationId);
          emailPayload.append('Họ và tên', formData.fullName);
          emailPayload.append('Số điện thoại', formData.phone);
          emailPayload.append('Email', formData.email || 'Không cung cấp');
          emailPayload.append('Vị trí ứng tuyển', formData.position);
          emailPayload.append('Khu vực làm việc', formData.location);
          emailPayload.append('CV ứng viên', submission.cvUrl);
          emailPayload.append('Lời nhắn', formData.coverLetter || 'Không có');
          emailPayload.append('UTM Source', window.location.search || 'Direct');
          emailPayload.append('_url', window.location.hostname === 'localhost'
            ? 'https://hr.onesphere.co/'
            : window.location.href);
          emailPayload.append('_subject', `[OneSphere Tuyển dụng] ${formData.position} - ${formData.fullName}`);
          emailPayload.append('_template', 'table');
          emailPayload.append('_captcha', 'false');

          const emailResponse = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(HR_EMAIL)}`, {
            method: 'POST',
            headers: { Accept: 'application/json' },
            body: emailPayload,
            signal: AbortSignal.timeout(15000)
          });
          const emailResult = await emailResponse.json().catch(() => ({}));
          if (!emailResponse.ok || (emailResult.success !== true && emailResult.success !== 'true')) {
            throw new Error(emailResult.message || 'CV đã được lưu nhưng chưa gửi được email cho HR.');
          }

          void updateApplicationEmailStatus(submission.applicationId, 'Sent');
        } catch (emailError) {
          console.error('HR email notification error:', emailError);
          void updateApplicationEmailStatus(submission.applicationId, 'Failed', emailError.message);
        }
      }
      setSubmitSuccess(true);

      // Track Meta Pixel Lead event
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'Lead', {
          content_name: formData.position,
          content_category: 'Recruitment Application',
          location: formData.location,
          value: 1,
          currency: 'VND'
        });
      }
    } catch (err) {
      console.error('Form submission error:', err);
      setSubmitError(err.message || 'Đã có lỗi xảy ra khi gửi hồ sơ. Vui lòng kiểm tra lại kết nối mạng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setFormData({
      fullName: '',
      phone: '',
      email: '',
      position: sametelJobs[0]?.title || '',
      location: sametelJobs[0]?.locations?.[0] || 'Hà Nội',
      cvFile: null,
      coverLetter: '',
    });
    setFormErrors({});
    setSubmitSuccess(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans antialiased selection:bg-blue-600 selection:text-white pb-20 md:pb-0">
      
      {/* Header */}
      <header className={`fixed top-0 w-full z-40 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200/80 py-3' 
          : 'bg-white/80 backdrop-blur-sm border-b border-slate-100 py-4'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          
          {/* Logo & Stock Code */}
          <div className="flex items-center gap-4">
            <a 
              href="https://hr.onesphere.co/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 group"
              title="Truy cập Website chính thức OneSphere"
            >
              <img 
                src="/logoandfavi/onesphere_logo.png" 
                alt="OneSphere" 
                className="h-10 sm:h-12 w-auto object-contain rounded transition-transform group-hover:scale-105" 
              />
            </a>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 font-medium text-sm text-slate-600">
            <a href="#about" className="hover:text-blue-700 transition-colors">Về OneSphere</a>
            <a href="#openings" className="hover:text-blue-700 transition-colors">Vị trí tuyển dụng</a>
            <a href="#benefits" className="hover:text-blue-700 transition-colors">Quyền lợi</a>
            <a href="#apply" className="hover:text-blue-700 transition-colors">Nộp hồ sơ</a>
          </nav>

          {/* Apply Now Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSelectJobAndScroll(sametelJobs[0]?.title, sametelJobs[0]?.id, sametelJobs[0]?.locations?.[0])}
              className="bg-blue-700 hover:bg-blue-800 text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl shadow-md shadow-blue-700/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Ứng tuyển ngay</span>
              <span className="material-symbols-outlined text-base">arrow_downward</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20">
        
        {/* SECTION 1 — HERO */}
        <section 
          className="relative overflow-hidden py-16 sm:py-28 border-b border-slate-100 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/onesphere_hero_bg.webp')" }}
        >
          {/* Lớp phủ mờ dần về phía giữa trung tâm để tôn chữ, 2 bên vẫn sắc nét */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 70% 80% at 50% 50%, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.65) 55%, rgba(255, 255, 255, 0.15) 85%, transparent 100%)'
            }}
          ></div>
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#F8FAFC] to-transparent pointer-events-none"></div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100/80 border border-blue-200/80 text-blue-800 font-semibold text-xs sm:text-sm uppercase tracking-wider shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                OneSphere tuyển dụng 2026 • Hà Nội – TP.HCM
              </div>

              {/* Main Headline */}
              <h1 className="font-display-lg text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-snug">
                ONESPHERE CHIÊU MỘ ĐỒNG ĐỘI – PHÁT TRIỂN ĐỘT PHÁ CÙNG <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  HỆ SINH THÁI SOLAR
                </span>
              </h1>

              {/* Description */}
              <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
                <strong className="font-extrabold text-blue-700">OneSphere</strong>, nổi bật với văn hóa trao quyền để bạn chủ động phát huy năng lực và nhận về thành quả xứng đáng.
                <br />
                Thu nhập 10–25 triệu + hoa hồng, có đào tạo kiến thức làm việc.
              </p>

              {/* Hero CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                <a 
                  href="#openings" 
                  className="w-full sm:w-auto bg-blue-700 hover:bg-blue-800 text-white font-bold text-base px-8 py-4 rounded-xl shadow-lg shadow-blue-700/25 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <span>XEM VỊ TRÍ ĐANG TUYỂN</span>
                  <span className="material-symbols-outlined text-xl">arrow_forward</span>
                </a>
                
                <a 
                  href="#apply" 
                  className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-800 font-bold text-base px-8 py-4 rounded-xl border border-slate-200 shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <span>Nộp hồ sơ trực tuyến</span>
                </a>
              </div>

            </div>
          </div>
        </section>

        {/* SECTION 2 — QUICK PROOF / VỀ ONESPHERE */}
        <section className="py-20 bg-white border-b border-slate-100" id="about">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Section Header */}
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                Về OneSphere
              </span>
              <h2 className="font-display-lg text-2xl sm:text-4xl font-extrabold text-slate-900 leading-snug">
                Gần 20 năm kiến tạo hệ sinh thái -<br />Trao quyền làm chủ, mở lối thành công
              </h2>
              <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
                OneSphere là nền tảng đầu tư phát triển theo mô hình roll-up. Chúng tôi tin vào năng lực của mỗi nhân viên, trao quyền làm chủ, cùng chia sẻ tài nguyên để tăng trưởng dài hạn và bứt phá thu nhập.
              </p>
            </div>

            {/* 3 Pillar Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {PILLARS.map((p, i) => (
              <div key={p.title} className="bg-slate-50 hover:bg-blue-50/50 p-8 rounded-2xl border border-slate-200/80 hover:border-blue-300 transition-all duration-300 space-y-3 group shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-2xl">{p.icon}</span>
                  </div>
                  <span className="text-3xl font-extrabold text-slate-200 font-display-lg">0{i + 1}</span>
                </div>
                <h3 className="font-display-lg text-lg font-bold text-slate-900">{p.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{p.text}</p>
              </div>
              ))}
            </div>

            {/* Credibility strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {STATS.map(s => (
                <div key={s.value} className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 text-center">
                  <div className="text-lg sm:text-xl font-extrabold text-blue-700 font-display-lg">{s.value}</div>
                  <div className="text-xs text-slate-500 mt-1 leading-snug">{s.text}</div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* SECTION — VĂN HÓA */}
        <section className="py-16 sm:py-20 bg-[#F8FAFC] border-b border-slate-100" id="culture">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              <h2 className="font-display-lg text-2xl sm:text-3xl font-extrabold text-slate-900 leading-snug">
                Văn hóa mỗi cá thể là một doanh nhân, tự chủ trong mọi hành động
              </h2>
              <ul className="space-y-4">
                {CULTURE.map(c => (
                  <li key={c.title} className="flex items-start gap-3 text-sm sm:text-base text-slate-600">
                    <span className="material-symbols-outlined text-blue-700 shrink-0">check_circle</span>
                    <span><strong className="text-slate-900">{c.title}</strong> – {c.text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <img
              src="/images/onesphere_team_culture.webp"
              alt="Đội ngũ OneSphere cùng làm việc về giải pháp năng lượng mặt trời"
              loading="lazy" width="1200" height="800"
              className="rounded-3xl shadow-xl border border-slate-200 w-full h-auto"
            />
          </div>
        </section>

        {/* SECTION 3 — BẠN ĐANG TÌM CƠ HỘI NÀO? (5 COMPACT CARDS + POP-UP JD) */}
        <section className="py-20 sm:py-28 bg-[#F8FAFC]" id="openings">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-100/80 px-3 py-1 rounded-full border border-blue-200">
                {sametelJobs.length} Vị Trí Tuyển Dụng
              </span>
              <h2 className="font-display-lg text-3xl sm:text-4xl font-extrabold text-slate-900">
                Bạn đang tìm kiếm cơ hội nào?
              </h2>
              <p className="text-slate-600 text-base sm:text-lg">
                Nhấp <strong>"Xem chi tiết JD"</strong> để xem đầy đủ bản mô tả công việc hoặc ứng tuyển trực tiếp vào OneSphere.
              </p>
            </div>

            {/* Horizontal Job Rows Layout */}
            <div className="space-y-4 max-w-6xl mx-auto">
              {sametelJobs.map((job) => (
                <div 
                  key={job.id}
                  className={`bg-white hover:bg-blue-50/30 rounded-2xl p-5 sm:p-6 border transition-all duration-300 shadow-sm hover:shadow-md hover:border-blue-400 flex flex-col lg:flex-row lg:items-center justify-between gap-5 group ${
                    selectedJobId === job.id ? 'border-blue-600 ring-2 ring-blue-600/15' : 'border-slate-200/90'
                  }`}
                >
                  
                  {/* Left Column: Code, Title & Badges */}
                  <div className="flex items-start sm:items-center gap-4 flex-1">
                    <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 font-extrabold flex items-center justify-center text-sm border border-blue-200/80 shrink-0 font-display-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      {job.code}
                    </span>

                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display-lg text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors leading-snug">
                          {job.title}
                        </h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1 font-semibold bg-slate-100 px-2.5 py-0.5 rounded-md text-slate-700">
                          <span className="material-symbols-outlined text-sm text-blue-600">group</span>
                          {job.quantity}
                        </span>
                        <span className="inline-flex items-center gap-1 font-semibold bg-slate-100 px-2.5 py-0.5 rounded-md text-slate-700">
                          <span className="material-symbols-outlined text-sm text-rose-500">location_on</span>
                          {job.locationText}
                        </span>
                        <span className="inline-flex items-center gap-1 font-medium text-slate-500">
                          <span className="material-symbols-outlined text-sm text-slate-400">schedule</span>
                          {job.workType}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle Column: Salary & Highlight */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-stretch justify-center gap-1.5 shrink-0 lg:w-[22rem]">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50/70 border border-blue-100">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Thu nhập:</span>
                      <span className="text-xs sm:text-sm font-extrabold text-blue-900 whitespace-nowrap">
                        {job.cardSalary || job.salary}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs text-amber-500">verified</span>
                      <span className="truncate max-w-[260px]">{job.highlight}</span>
                    </div>
                  </div>

                  {/* Right Column: CTA Buttons */}
                  <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <button
                      onClick={() => handleOpenJdModal(job)}
                      className="flex-1 sm:flex-initial bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200/80 hover:border-blue-300"
                    >
                      <span className="material-symbols-outlined text-base">visibility</span>
                      <span>Xem JD</span>
                    </button>

                    <button
                      onClick={() => handleSelectJobAndScroll(job.title, job.id, job.locations[0])}
                      className="flex-1 sm:flex-initial bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs sm:text-sm py-2.5 px-5 rounded-xl shadow-sm shadow-blue-700/20 active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <span>Ứng tuyển</span>
                      <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </button>
                  </div>

                </div>
              ))}
            </div>

            {/* Note text under cards */}
            <div className="mt-8 text-center text-xs text-slate-500">
              * Toàn bộ điều kiện, lương và quyền lợi bám sát theo tiêu chuẩn tuyển dụng chính thức của OneSphere.
            </div>

          </div>
        </section>

        {/* FULL JD POP-UP MODAL */}
        {activeModalJob && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
            onClick={handleCloseJdModal}
          >
            <div 
              className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              
              {/* Modal Header */}
              <div className="p-6 sm:p-8 bg-gradient-to-r from-blue-800 to-indigo-900 text-white relative flex justify-between items-start gap-4">
                <div className="space-y-3 pr-8">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                      MÃ VỊ TRÍ: {activeModalJob.code}
                    </span>
                    <span className="text-xs font-medium text-blue-200">
                      {activeModalJob.workType}
                    </span>
                  </div>
                  <h2 className="font-display-lg text-xl sm:text-2xl font-extrabold leading-snug">
                    {activeModalJob.title}
                  </h2>
                  <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
                    <span className="bg-emerald-500/20 text-emerald-300 font-bold px-3 py-1 rounded-xl border border-emerald-400/30">
                      💰 {activeModalJob.salary}
                    </span>
                    <span className="bg-white/10 text-white px-3 py-1 rounded-xl">
                      👥 {activeModalJob.quantity}
                    </span>
                    <span className="bg-white/10 text-white px-3 py-1 rounded-xl">
                      📍 {activeModalJob.locationText}
                    </span>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={handleCloseJdModal}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
                  title="Đóng cửa sổ"
                >
                  <span className="material-symbols-outlined text-2xl">close</span>
                </button>
              </div>

              {/* Modal Scrollable Body */}
              <div className="p-6 sm:p-8 overflow-y-auto space-y-8 text-slate-700 text-sm sm:text-base leading-relaxed">

                {/* THÔNG ĐIỆP DÀNH CHO ỨNG VIÊN */}
                {activeModalJob.callout && (
                  <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-blue-50/90 border border-blue-200/80 shadow-sm space-y-2.5">
                    {activeModalJob.callout.headline && (
                      <h4 className="font-display-lg text-base sm:text-lg font-bold text-slate-900 leading-snug">
                        {activeModalJob.callout.headline}
                      </h4>
                    )}
                    <p className="text-slate-600 text-xs sm:text-sm whitespace-pre-line leading-relaxed">
                      {activeModalJob.callout.content}
                    </p>
                  </div>
                )}
                
                {/* 1. MÔ TẢ CÔNG VIỆC */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="material-symbols-outlined text-blue-700 text-2xl">description</span>
                    <h3 className="font-display-lg text-lg font-bold text-slate-900">
                      MÔ TẢ CÔNG VIỆC
                    </h3>
                  </div>
                  <div className="space-y-3.5 pl-1">
                    {activeModalJob.descriptionSections ? (
                      activeModalJob.descriptionSections.map((sec, idx) => (
                        <div key={idx} className="space-y-1">
                          <h4 className="font-bold text-slate-800 text-sm sm:text-base flex items-start gap-2">
                            <span className="text-blue-600 mt-0.5 font-bold">•</span>
                            <span>{sec.title}:</span>
                          </h4>
                          <p className="text-slate-600 text-xs sm:text-sm pl-4 whitespace-pre-line leading-relaxed">
                            {sec.content}
                          </p>
                        </div>
                      ))
                    ) : (
                      activeModalJob.duties?.map((duty, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-600">
                          <span className="text-blue-600 font-bold mt-0.5">•</span>
                          <span>{duty}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 2. YÊU CẦU ỨNG VIÊN */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="material-symbols-outlined text-blue-700 text-2xl">task_alt</span>
                    <h3 className="font-display-lg text-lg font-bold text-slate-900">
                      YÊU CẦU ỨNG VIÊN
                    </h3>
                  </div>

                  {Array.isArray(activeModalJob.requirements) ? (
                    <ul className="space-y-2.5 pl-1">
                      {activeModalJob.requirements.map((req, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-600">
                          <span className="material-symbols-outlined text-base text-emerald-600 mt-0.5 shrink-0">check_circle</span>
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="space-y-4 text-xs sm:text-sm text-slate-600 pl-1">
                      {activeModalJob.requirements?.general && (
                        <ul className="space-y-2.5">
                          {activeModalJob.requirements.general.map((req, idx) => (
                            <li key={idx} className="flex items-start gap-2.5">
                              <span className="material-symbols-outlined text-base text-emerald-600 mt-0.5 shrink-0">check_circle</span>
                              <span>{req}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {activeModalJob.requirements?.advantages && (
                        <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-2">
                          <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-700 text-base">stars</span>
                            <span>{activeModalJob.requirements.advantagesTitle || 'Bạn sẽ có lợi thế nếu:'}</span>
                          </div>
                          <ul className="space-y-2 pl-2">
                            {activeModalJob.requirements.advantages.map((adv, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-slate-700">
                                <span className="text-blue-600 font-bold">•</span>
                                <span>{adv}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {activeModalJob.requirements?.note && (
                        <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 font-medium text-xs sm:text-sm flex items-start gap-2.5">
                          <span className="material-symbols-outlined text-base text-amber-600 mt-0.5 shrink-0">info</span>
                          <span>{activeModalJob.requirements.note}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. QUYỀN LỢI */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="material-symbols-outlined text-blue-700 text-2xl">card_giftcard</span>
                    <h3 className="font-display-lg text-lg font-bold text-slate-900">
                      QUYỀN LỢI
                    </h3>
                  </div>
                  <ul className="space-y-2.5 pl-1">
                    {activeModalJob.benefits.map((ben, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-600">
                        <span className="material-symbols-outlined text-base text-amber-600 mt-0.5 shrink-0">military_tech</span>
                        <span>{ben}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 5. ĐỊA ĐIỂM & THỜI GIAN LÀM VIỆC */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="material-symbols-outlined text-blue-700 text-2xl">apartment</span>
                    <h3 className="font-display-lg text-lg font-bold text-slate-900">
                      ĐỊA ĐIỂM &amp; THỜI GIAN LÀM VIỆC
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Location */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                      <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                        <span className="material-symbols-outlined text-base">location_on</span>
                        <span>Địa điểm làm việc:</span>
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-slate-700 pl-6">
                        {activeModalJob.locationText || 'Hà Nội | TP. Hồ Chí Minh'}
                      </p>
                    </div>

                    {/* Working Hours */}
                    <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 space-y-1.5">
                      <div className="flex items-center gap-2 text-blue-800 font-bold text-sm">
                        <span className="material-symbols-outlined text-base">schedule</span>
                        <span>Thời gian làm việc:</span>
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-slate-700 pl-6">
                        8:00 – 17:00 (Thứ 2 – Thứ 6 và sáng Thứ 7. Nghỉ chiều Thứ 7 &amp; Chủ Nhật)
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Modal Footer CTA */}
              <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 flex justify-end items-center">
                <button
                  type="button"
                  onClick={() => handleSelectJobAndScroll(activeModalJob.title, activeModalJob.id, activeModalJob.locations[0])}
                  className="w-full sm:w-auto bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-sm sm:text-base py-3.5 px-8 rounded-xl shadow-lg shadow-blue-700/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Ứng tuyển vị trí này ngay</span>
                  <span className="material-symbols-outlined text-lg">arrow_downward</span>
                </button>
              </div>

            </div>
          </div>
        )}

        {/* SECTION 4 — ĐIỀU GÌ ĐANG CHỜ BẠN TẠI ONESPHERE? */}
        <section className="py-20 bg-white border-b border-slate-100" id="benefits">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                Phúc Lợi &amp; Phát Triển
              </span>
              <h2 className="font-display-lg text-3xl sm:text-4xl font-extrabold text-slate-900">
                Điều gì đang chờ bạn tại OneSphere?
              </h2>
              <p className="text-slate-600 text-base sm:text-lg">
                Một hệ sinh thái công việc gắn liền với Solar – BESS – Inverter và các mảng phân phối, EPC, bán lẻ.
              </p>
            </div>

            {/* 6 Benefits Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Benefit 1 */}
              <div className="p-6 sm:p-8 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/40 transition-all duration-300 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-2xl">handshake</span>
                </div>
                <h3 className="font-bold text-base sm:text-lg text-slate-900">
                  Làm việc trực tiếp với đối tác lớn
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Làm việc trực tiếp với hệ thống Đại lý, Nhà thầu EPC quy mô lớn và mạng lưới khách hàng doanh nghiệp trên toàn quốc.
                </p>
              </div>

              {/* Benefit 2 */}
              <div className="p-6 sm:p-8 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/40 transition-all duration-300 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-2xl">school</span>
                </div>
                <h3 className="font-bold text-base sm:text-lg text-slate-900">
                  Đào tạo chuyên sâu Solar – BESS
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Được đào tạo bài bản và nâng cao kiến thức chuyên môn về công nghệ Solar – BESS – Inverter từ các chuyên gia đầu ngành.
                </p>
              </div>

              {/* Benefit 3 */}
              <div className="p-6 sm:p-8 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/40 transition-all duration-300 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-2xl">monetization_on</span>
                </div>
                <h3 className="font-bold text-base sm:text-lg text-slate-900">
                  Chính sách Hoa hồng / KPI hấp dẫn
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Hưởng hoa hồng cao không giới hạn và thưởng KPI theo đặc thù từng vị trí, xứng đáng với đóng góp và năng lực thực tế.
                </p>
              </div>

              {/* Benefit 4 */}
              <div className="p-6 sm:p-8 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/40 transition-all duration-300 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-2xl">health_and_safety</span>
                </div>
                <h3 className="font-bold text-base sm:text-lg text-slate-900">
                  Đầy đủ chế độ Bảo hiểm
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Tham gia đầy đủ BHXH, BHYT, BHTN theo đúng quy định pháp luật và chính sách từng vị trí của doanh nghiệp niêm yết.
                </p>
              </div>

              {/* Benefit 5 */}
              <div className="p-6 sm:p-8 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/40 transition-all duration-300 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-2xl">card_giftcard</span>
                </div>
                <h3 className="font-bold text-base sm:text-lg text-slate-900">
                  Thưởng Lễ Tết &amp; Phúc lợi phong phú
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Thưởng lương tháng 13, thưởng Quý/Năm, quà tặng các dịp Lễ Tết, du lịch hàng năm và các chế độ hiếu hỷ đầy đủ.
                </p>
              </div>

              {/* Benefit 6 */}
              <div className="p-6 sm:p-8 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/40 transition-all duration-300 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-2xl">military_tech</span>
                </div>
                <h3 className="font-bold text-base sm:text-lg text-slate-900">
                  Lộ trình thăng tiến rõ ràng
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Lộ trình phát triển minh bạch lên Team Lead, Giám đốc Kinh doanh (CCO) hoặc Giám đốc Kỹ thuật (Technical Director), và cơ hội tham gia vận hành, phát triển đơn vị thành viên trong hệ sinh thái.
                </p>
              </div>

            </div>

          </div>
        </section>

        {/* SECTION 5 — FORM ỨNG TUYỂN */}
        <section className="py-20 sm:py-28 bg-slate-100" id="apply" ref={formRef}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div className="bg-white rounded-3xl border border-slate-300 shadow-[0_12px_40px_-8px_rgba(30,64,175,0.28)] ring-1 ring-blue-700/10 overflow-hidden">
              
              {/* Form Header */}
              <div className="bg-gradient-to-r from-blue-800 to-indigo-900 text-white p-8 sm:p-10 text-center relative overflow-hidden">
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-cyan-400/10 rounded-full blur-2xl"></div>
                <div className="relative z-10 space-y-3">
                  <span className="inline-block text-xs font-bold uppercase tracking-wider text-cyan-300 bg-white/10 px-3 py-1 rounded-full border border-white/20">
                    Cổng Tiếp Nhận Hồ Sơ
                  </span>
                  <h2 className="font-display-lg text-2xl sm:text-3xl font-extrabold text-white">
                    TÌM THẤY VỊ TRÍ PHÙ HỢP? <br />
                    GỬI THÔNG TIN CHO ONESPHERE
                  </h2>
                  <p className="text-sm sm:text-base text-blue-100 max-w-xl mx-auto">
                    Điền đầy đủ thông tin bên dưới để ứng tuyển trực tiếp đến Ban Tuyển dụng OneSphere.
                  </p>
                </div>
              </div>

              {/* Form Body */}
              <div className="p-6 sm:p-10">
                
                {submitSuccess ? (
                  /* Success Screen */
                  <div className="text-center py-12 space-y-6 animate-fade-in">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md">
                      <span className="material-symbols-outlined text-5xl">check_circle</span>
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-display-lg text-2xl font-bold text-slate-900">
                        Hồ sơ đã được tiếp nhận!
                      </h3>
                      <p className="text-slate-600 text-sm sm:text-base max-w-md mx-auto">
                        Cảm ơn bạn đã ứng tuyển vào vị trí <strong>{formData.position}</strong> tại OneSphere. Hồ sơ của bạn đã được lưu. Bộ phận tuyển dụng sẽ liên hệ với hồ sơ phù hợp.
                      </p>
                    </div>
                    
                    {/* Summary card */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left max-w-md mx-auto text-xs sm:text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Họ và tên:</span>
                        <span className="font-bold text-slate-800">{formData.fullName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Số điện thoại:</span>
                        <span className="font-bold text-slate-800">{formData.phone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Khu vực làm việc:</span>
                        <span className="font-bold text-slate-800">{formData.location}</span>
                      </div>
                      {formData.cvFile && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">File CV đính kèm:</span>
                          <span className="font-bold text-blue-700 truncate max-w-[200px]">{formData.cvFile.name}</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleResetForm}
                      className="bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm px-8 py-3 rounded-xl transition-all shadow-md cursor-pointer"
                    >
                      Ứng tuyển vị trí khác
                    </button>
                  </div>
                ) : (
                  /* Form Fields */
                  <form onSubmit={handleFormSubmit} className="space-y-6">
                    
                    {submitError && (
                      <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">error</span>
                        <span>{submitError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      
                      {/* Field 1: Họ và tên */}
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 flex items-center justify-between">
                          <span>Họ và tên <span className="text-red-500">*</span></span>
                        </label>
                        <input
                          type="text"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          placeholder="Ví dụ: Nguyễn Văn A"
                          className={`w-full px-4 py-3.5 rounded-xl border bg-slate-50 text-sm focus:outline-none focus:ring-2 transition-all ${
                            formErrors.fullName 
                              ? 'border-red-400 focus:ring-red-200 bg-red-50/20' 
                              : 'border-slate-200 focus:ring-blue-100 focus:border-blue-600'
                          }`}
                        />
                        {formErrors.fullName && (
                          <p className="text-xs text-red-500 font-medium">{formErrors.fullName}</p>
                        )}
                      </div>

                      {/* Field 2: Số điện thoại */}
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 flex items-center justify-between">
                          <span>Số điện thoại <span className="text-red-500">*</span></span>
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="Ví dụ: 0912 345 678"
                          className={`w-full px-4 py-3.5 rounded-xl border bg-slate-50 text-sm focus:outline-none focus:ring-2 transition-all ${
                            formErrors.phone 
                              ? 'border-red-400 focus:ring-red-200 bg-red-50/20' 
                              : 'border-slate-200 focus:ring-blue-100 focus:border-blue-600'
                          }`}
                        />
                        {formErrors.phone && (
                          <p className="text-xs text-red-500 font-medium">{formErrors.phone}</p>
                        )}
                      </div>

                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      
                      {/* Field 3: Email */}
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">
                          Địa chỉ Email
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="email@example.com"
                          className={`w-full px-4 py-3.5 rounded-xl border bg-slate-50 text-sm focus:outline-none focus:ring-2 transition-all ${
                            formErrors.email 
                              ? 'border-red-400 focus:ring-red-200 bg-red-50/20' 
                              : 'border-slate-200 focus:ring-blue-100 focus:border-blue-600'
                          }`}
                        />
                        {formErrors.email && (
                          <p className="text-xs text-red-500 font-medium">{formErrors.email}</p>
                        )}
                      </div>

                      {/* Field 4: Khu vực muốn làm việc */}
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">
                          Khu vực muốn làm việc <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="location"
                          value={formData.location}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition-all font-medium text-slate-800"
                        >
                          <option value="Hà Nội">Hà Nội</option>
                          <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                        </select>
                      </div>

                    </div>

                    {/* Field 5: Vị trí muốn ứng tuyển */}
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">
                        Vị trí muốn ứng tuyển <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="position"
                        value={formData.position}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition-all font-medium text-slate-800"
                      >
                        {sametelJobs.map(job => (
                          <option key={job.id} value={job.title}>
                            {job.code}. {job.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Field 7: Upload CV */}
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 flex items-center justify-between">
                        <span>Tải lên CV (định dạng PDF) <span className="text-red-500">*</span></span>
                        <span className="text-xs text-slate-400 font-normal">Tối đa 10MB</span>
                      </label>
                      
                      <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer relative ${
                        formErrors.cvFile 
                          ? 'border-red-400 bg-red-50/20' 
                          : formData.cvFile 
                            ? 'border-blue-500 bg-blue-50/40' 
                            : 'border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/20'
                      }`}>
                        <input
                          type="file"
                          id="cv-file-input"
                          accept=".pdf,application/pdf"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        
                        <label htmlFor="cv-file-input" className="cursor-pointer block space-y-2">
                          {formData.cvFile ? (
                            <div className="flex items-center justify-center gap-3">
                              <span className="material-symbols-outlined text-3xl text-blue-600">picture_as_pdf</span>
                              <div className="text-left">
                                <div className="text-sm font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
                                  {formData.cvFile.name}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {(formData.cvFile.size / 1024 / 1024).toFixed(2)} MB • Nhấp để thay đổi
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={handleRemoveFile}
                                className="p-1 rounded-full hover:bg-slate-200 text-slate-500 hover:text-red-600 transition-colors ml-2"
                                title="Xóa file"
                              >
                                <span className="material-symbols-outlined text-xl">close</span>
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mx-auto">
                                <span className="material-symbols-outlined text-2xl">cloud_upload</span>
                              </div>
                              <div className="text-sm text-slate-700">
                                <span className="font-bold text-blue-700">Nhấp để chọn file CV (PDF)</span> hoặc kéo thả vào đây
                              </div>
                              <p className="text-xs text-slate-400">
                                Định dạng hỗ trợ: File PDF (.pdf)
                              </p>
                            </>
                          )}
                        </label>
                      </div>
                      
                      {formErrors.cvFile && (
                        <p className="text-xs text-red-500 font-medium">{formErrors.cvFile}</p>
                      )}
                    </div>

                    {/* Field 8: Lời nhắn / Ghi chú */}
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">
                        Lời nhắn / Giới thiệu bản thân (Không bắt buộc)
                      </label>
                      <textarea
                        name="coverLetter"
                        value={formData.coverLetter}
                        onChange={handleInputChange}
                        rows="3"
                        placeholder="Hãy chia sẻ ngắn gọn về kinh nghiệm hoặc lý do bạn muốn đồng hành cùng OneSphere..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition-all text-slate-800"
                      ></textarea>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-base sm:text-lg py-4 px-8 rounded-xl shadow-lg shadow-blue-700/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <>
                            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            <span>ĐANG GỬI HỒ SƠ VỀ BAN TUYỂN DỤNG...</span>
                          </>
                        ) : (
                          <>
                            <span>GỬI HỒ SƠ ỨNG TUYỂN</span>
                            <span className="material-symbols-outlined text-xl">send</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Privacy Note */}
                    <p className="text-center text-xs text-slate-500 leading-relaxed pt-2">
                      🔒 Nhấn &quot;Gửi hồ sơ ứng tuyển&quot; đồng nghĩa với việc bạn cho phép OneSphere lưu trữ và xử lý thông tin này phục vụ cho công tác tuyển dụng. Chúng tôi cam kết không chia sẻ dữ liệu cho bên thứ ba và chỉ liên hệ với hồ sơ phù hợp.
                    </p>

                  </form>
                )}

              </div>

            </div>

          </div>
        </section>

        {/* SECTION CUỐI — FINAL CTA */}
        <section className="py-20 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white relative overflow-hidden">
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl"></div>
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
          
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6">
            
            <h2 className="font-display-lg text-2xl sm:text-4xl lg:text-5xl font-extrabold leading-snug">
              Cùng xây dựng chặng đường tiếp theo cùng OneSphere
            </h2>
            
            <p className="text-base sm:text-lg text-blue-100 max-w-2xl mx-auto leading-relaxed">
              Đừng chỉ tìm một công việc mới. Hãy tìm một vị trí phù hợp để tiếp tục phát triển kinh nghiệm, thu nhập và sự nghiệp của bạn.
            </p>

            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 inline-block max-w-xl">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-cyan-300">
                ONESPHERE – TRAO QUYỀN • TỰ CHỦ • TĂNG TRƯỞNG DÀI HẠN
              </span>
            </div>

            <div className="pt-2">
              <button
                onClick={() => handleSelectJobAndScroll(sametelJobs[0]?.title, sametelJobs[0]?.id, sametelJobs[0]?.locations?.[0])}
                className="bg-white text-blue-800 hover:bg-slate-50 font-extrabold text-base px-10 py-4 rounded-xl shadow-xl active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <span>ỨNG TUYỂN NGAY</span>
                <span className="material-symbols-outlined text-xl text-blue-700">arrow_upward</span>
              </button>
            </div>

          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="w-full py-16 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-10">
          
          {/* Col 1: Company Logo & Info */}
          <div className="space-y-4 col-span-1 md:col-span-1">
            <a 
              href="https://hr.onesphere.co/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block group"
              title="Truy cập Website chính thức OneSphere"
            >
              <img 
                src="/logoandfavi/onesphere_logo.png" 
                alt="OneSphere" 
                className="h-12 w-auto object-contain rounded transition-transform group-hover:scale-105" 
              />
            </a>
            <p className="text-xs text-slate-500 leading-relaxed">
              <strong className="text-slate-800 font-bold">CÔNG TY CỔ PHẦN ONESPHERE</strong>
              <br />
              OneSphere – Hệ sinh thái kinh doanh trong phân phối công nghiệp, năng lượng mặt trời và bán lẻ solar.
            </p>
          </div>

          {/* Col 2: Văn phòng & Nhà máy */}
          <div className="space-y-3 col-span-1 md:col-span-2">
            <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
              Hệ Thống Trụ Sở &amp; Chi Nhánh
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-base text-blue-700 shrink-0">factory</span>
                <span>
                  <strong className="text-slate-800">Nhà máy sản xuất (13.000 m²):</strong> KCN Long Thành, Huyện Long Thành, Tỉnh Đồng Nai.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-base text-blue-700 shrink-0">location_on</span>
                <span>
                  <strong className="text-slate-800">Chi nhánh Hà Nội:</strong> Tầng 9, Tòa nhà Thiên Niên Kỷ, Số 4 Quang Trung, Hà Đông, Hà Nội.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-base text-blue-700 shrink-0">location_on</span>
                <span>
                  <strong className="text-slate-800">Chi nhánh TP.HCM:</strong> 31–33 Đường 18, Phường Thông Tây Hội, TP. Hồ Chí Minh.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-base text-blue-700 shrink-0">location_on</span>
                <span>
                  <strong className="text-slate-800">Chi nhánh Đà Nẵng:</strong> Văn phòng kinh doanh khu vực Miền Trung.
                </span>
              </li>
            </ul>
          </div>

          {/* Col 3: Liên hệ Tuyển dụng */}
          <div className="space-y-3 col-span-1">
            <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
              Liên Hệ Tuyển Dụng
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-600">
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-blue-700">mail</span>
                <a href={`mailto:${HR_EMAIL}`} className="hover:text-blue-700 font-medium">{HR_EMAIL}</a>
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-blue-700">language</span>
                <a href="https://hr.onesphere.co/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-700">hr.onesphere.co</a>
              </li>
            </ul>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 gap-2">
          <div>
            © 2026 OneSphere. Bảo lưu mọi quyền.
          </div>
          <div>
            Website Tuyển dụng chính thức OneSphere
          </div>
        </div>
      </footer>

      {/* Sticky apply button (mobile) */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-30 p-3 bg-white/95 backdrop-blur border-t border-slate-200">
        <button
          onClick={() => handleSelectJobAndScroll(sametelJobs[0]?.title, sametelJobs[0]?.id, sametelJobs[0]?.locations?.[0])}
          className="w-full bg-blue-700 hover:bg-blue-800 text-white font-extrabold py-3.5 rounded-xl cursor-pointer"
        >
          ỨNG TUYỂN NGAY
        </button>
      </div>
    </div>
  );
}

export default App;
