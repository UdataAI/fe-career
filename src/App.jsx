import React, { useState, useEffect, useRef } from 'react';
import sametelJobs from './data/sametel_jobs.json';
import { trackPageView, trackFormSubmission } from './utils/tracker';

const HR_EMAIL = import.meta.env.VITE_HR_EMAIL || 'hr@sametel.com.vn';

function App() {
  const [selectedJobId, setSelectedJobId] = useState('distribution-manager');
  const [activeModalJob, setActiveModalJob] = useState(null);
  const formRef = useRef(null);

  // Auto track page visit on load
  useEffect(() => {
    trackPageView();
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

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveModalJob(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    position: 'Trưởng Phòng Phân Phối (Distribution Manager)',
    location: 'Hà Nội',
    experience: '1–2 năm',
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
      setActiveModalJob(null);
    }
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleOpenJdModal = (job) => {
    setActiveModalJob(job);
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
      errors.cvFile = 'Vui lòng tải lên file CV (PDF/DOCX)';
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
      // 1. Upload CV file to cloud to get direct viewing/downloading link
      let cvDownloadUrl = '';
      if (formData.cvFile) {
        try {
          const uploadData = new FormData();
          uploadData.append('reqtype', 'fileupload');
          uploadData.append('fileToUpload', formData.cvFile, formData.cvFile.name);
          const upRes = await fetch('https://catbox.moe/user/api.php', {
            method: 'POST',
            body: uploadData
          });
          if (upRes.ok) {
            const urlText = await upRes.text();
            if (urlText && urlText.startsWith('http')) {
              cvDownloadUrl = urlText.trim();
            }
          }
        } catch (upErr) {
          console.warn('Catbox upload notice, trying fallback:', upErr);
        }

        // Fallback file hosting
        if (!cvDownloadUrl) {
          try {
            const fbData = new FormData();
            fbData.append('file', formData.cvFile, formData.cvFile.name);
            const fbRes = await fetch('https://tmpfiles.org/api/v1/upload', {
              method: 'POST',
              body: fbData
            });
            if (fbRes.ok) {
              const json = await fbRes.json();
              if (json?.data?.url) {
                cvDownloadUrl = json.data.url;
              }
            }
          } catch (fbErr) {
            console.warn('Fallback upload notice:', fbErr);
          }
        }
      }

      // 2. Prepare multipart form data for FormSubmit.co / Email API
      const payload = new FormData();
      payload.append('Họ và tên', formData.fullName);
      payload.append('Số điện thoại', formData.phone);
      payload.append('Email', formData.email || 'Không cung cấp');
      payload.append('Vị trí ứng tuyển', formData.position);
      payload.append('Khu vực làm việc', formData.location);
      payload.append('Số năm kinh nghiệm', formData.experience);
      if (formData.cvFile) {
        payload.append('Tên file CV', formData.cvFile.name);
      }
      if (cvDownloadUrl) {
        payload.append('Link xem & tải file CV', cvDownloadUrl);
      }
      payload.append('Lời nhắn', formData.coverLetter || 'Không có');
      payload.append('UTM Source', window.location.search || 'Direct');
      payload.append('_subject', `[SAMETEL Tuyển dụng] Ứng tuyển: ${formData.position} - ${formData.fullName}`);
      payload.append('_template', 'table');
      payload.append('_captcha', 'false');

      if (formData.cvFile) {
        payload.append('attachment', formData.cvFile, formData.cvFile.name);
      }

      // 3. Send to endpoint
      const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(HR_EMAIL)}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json'
        },
        body: payload
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok && (result.success === 'true' || result.success === true || result.message)) {
        setSubmitSuccess(true);
        // Record form submission to Google Sheets
        trackFormSubmission(formData, cvDownloadUrl);
      } else {
        throw new Error(result.message || 'Không thể gửi biểu mẫu. Vui lòng thử lại sau.');
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
      position: 'Trưởng Phòng Phân Phối (Distribution Manager)',
      location: 'Hà Nội',
      experience: '1–2 năm',
      cvFile: null,
      coverLetter: '',
    });
    setFormErrors({});
    setSubmitSuccess(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans antialiased selection:bg-blue-600 selection:text-white">
      
      {/* Header */}
      <header className={`fixed top-0 w-full z-40 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200/80 py-3' 
          : 'bg-white/80 backdrop-blur-sm border-b border-slate-100 py-4'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          
          {/* Logo & Stock Code */}
          <div className="flex items-center gap-4">
            <a href="#" className="flex items-center gap-2 group">
              <img 
                src="/logoandfavi/sametel_logo.png" 
                alt="SAMETEL Logo" 
                className="h-10 sm:h-12 w-auto object-contain rounded transition-transform group-hover:scale-105" 
              />
            </a>
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200 text-xs">
              <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                SMT • HNX
              </span>
              <span className="text-slate-500 font-medium">Solar – BESS – Inverter</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 font-medium text-sm text-slate-600">
            <a href="#about" className="hover:text-blue-700 transition-colors">Về SAMETEL</a>
            <a href="#openings" className="hover:text-blue-700 transition-colors">Vị trí tuyển dụng</a>
            <a href="#benefits" className="hover:text-blue-700 transition-colors">Quyền Lợi</a>
            <a href="#apply" className="hover:text-blue-700 transition-colors">Nộp Hồ Sơ</a>
          </nav>

          {/* Apply Now Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSelectJobAndScroll('Trưởng Phòng Phân Phối (Distribution Manager)', 'distribution-manager')}
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
        <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/70 via-white to-[#F8FAFC] py-16 sm:py-24 border-b border-slate-100">
          
          {/* Background Decorative Tech Elements */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute top-1/2 -left-24 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100/80 border border-blue-200/80 text-blue-800 font-semibold text-xs sm:text-sm uppercase tracking-wider shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                Tuyển dụng quy mô toàn quốc 2026
              </div>

              {/* Main Headline */}
              <h1 className="font-display-lg text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
                SAMETEL MỞ RỘNG ĐỘI NGŨ <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  SOLAR – BESS – INVERTER
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-lg sm:text-xl font-bold text-blue-900">
                26 cơ hội nghề nghiệp tại Hà Nội – TP.HCM – Đà Nẵng
              </p>

              {/* Description */}
              <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
                Cùng SAMETEL phát triển hệ thống kinh doanh, phân phối và kỹ thuật cho các giải pháp Solar – BESS – Inverter trên toàn quốc.
              </p>

              {/* Quick Highlight Stats Pill */}
              <div className="inline-flex flex-wrap items-center justify-center gap-2 sm:gap-3 p-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm text-xs sm:text-sm text-slate-700 font-medium">
                <span className="flex items-center gap-1 text-blue-700 font-bold">
                  <span className="material-symbols-outlined text-base">work</span>
                  5 nhóm vị trí
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1 text-emerald-700 font-bold">
                  <span className="material-symbols-outlined text-base">payments</span>
                  Lương cứng đến 40 triệu/tháng
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1 text-amber-700 font-bold">
                  <span className="material-symbols-outlined text-base">trending_up</span>
                  Hoa hồng/KPI theo từng vị trí
                </span>
              </div>

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

              {/* Subtext */}
              <p className="text-xs sm:text-sm text-slate-500 font-medium pt-2">
                Hà Nội • TP.HCM • Đà Nẵng | Full-time
              </p>

            </div>
          </div>
        </section>

        {/* SECTION 2 — QUICK PROOF / VÌ SAO LÀ SAMETEL? */}
        <section className="py-20 bg-white border-b border-slate-100" id="about">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Section Header */}
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                Năng lực &amp; Vị thế
              </span>
              <h2 className="font-display-lg text-2xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
                Gần 20 năm xây dựng năng lực trong Điện – Viễn thông – Solar
              </h2>
              <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
                SAMETEL được thành lập từ năm 2006 và hiện hoạt động trong các lĩnh vực Solar, Điện lực, Viễn thông cùng nhiều giải pháp công nghiệp.
              </p>
            </div>

            {/* 4 Proof Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              
              {/* Card 1 */}
              <div className="bg-slate-50 hover:bg-blue-50/50 p-8 rounded-2xl border border-slate-200/80 hover:border-blue-300 transition-all duration-300 text-center space-y-2 group shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-2xl">calendar_today</span>
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-blue-700 font-display-lg">
                  2006
                </div>
                <div className="text-sm font-semibold text-slate-600">
                  Năm thành lập
                </div>
                <p className="text-xs text-slate-500">
                  Gần 20 năm phát triển vững bền trên thị trường
                </p>
              </div>

              {/* Card 2 */}
              <div className="bg-slate-50 hover:bg-blue-50/50 p-8 rounded-2xl border border-slate-200/80 hover:border-blue-300 transition-all duration-300 text-center space-y-2 group shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-2xl">factory</span>
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-blue-700 font-display-lg">
                  13.000 m²
                </div>
                <div className="text-sm font-semibold text-slate-600">
                  Cơ sở sản xuất
                </div>
                <p className="text-xs text-slate-500">
                  Nhà máy hiện đại tại KCN Long Thành, Đồng Nai
                </p>
              </div>

              {/* Card 3 */}
              <div className="bg-slate-50 hover:bg-blue-50/50 p-8 rounded-2xl border border-slate-200/80 hover:border-blue-300 transition-all duration-300 text-center space-y-2 group shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-2xl">show_chart</span>
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-blue-700 font-display-lg">
                  SMT – HNX
                </div>
                <div className="text-sm font-semibold text-slate-600">
                  Doanh nghiệp niêm yết
                </div>
                <p className="text-xs text-slate-500">
                  Minh bạch tài chính và quản trị doanh nghiệp chuẩn mực
                </p>
              </div>

              {/* Card 4 */}
              <div className="bg-slate-50 hover:bg-blue-50/50 p-8 rounded-2xl border border-slate-200/80 hover:border-blue-300 transition-all duration-300 text-center space-y-2 group shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-2xl">solar_power</span>
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-blue-700 font-display-lg">
                  Solar thực chiến
                </div>
                <div className="text-sm font-semibold text-slate-600">
                  Hàng trăm dự án
                </div>
                <p className="text-xs text-slate-500">
                  Từ hàng trăm kWp đến trên 2 MWp trên toàn quốc
                </p>
              </div>

            </div>

            {/* Vision Statement Box */}
            <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl"></div>
              <div className="relative z-10 max-w-4xl mx-auto text-center space-y-4">
                <span className="material-symbols-outlined text-4xl text-cyan-400">format_quote</span>
                <blockquote className="text-base sm:text-xl font-medium leading-relaxed italic text-blue-100">
                  "SAMETEL định hướng trở thành nhà cung cấp hàng đầu Việt Nam các giải pháp cho ngành Điện, Viễn thông và Hệ thống điện mặt trời trên nền tảng công nghệ, đội ngũ chuyên nghiệp và văn hóa doanh nghiệp bền vững."
                </blockquote>
                <div className="text-xs uppercase tracking-widest text-cyan-300 font-bold pt-2">
                  Ban Lãnh Đạo CÔNG TY CỔ PHẦN SAMETEL
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* SECTION 3 — BẠN ĐANG TÌM CƠ HỘI NÀO? (5 COMPACT CARDS + POP-UP JD) */}
        <section className="py-20 sm:py-28 bg-[#F8FAFC]" id="openings">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-100/80 px-3 py-1 rounded-full border border-blue-200">
                5 Nhóm Vị Trí Tuyển Dụng
              </span>
              <h2 className="font-display-lg text-3xl sm:text-4xl font-extrabold text-slate-900">
                Bạn đang tìm kiếm cơ hội nào?
              </h2>
              <p className="text-slate-600 text-base sm:text-lg">
                Nhấp <strong>"Xem chi tiết JD"</strong> để xem đầy đủ bản mô tả công việc hoặc ứng tuyển trực tiếp vào SAMETEL.
              </p>
            </div>

            {/* 5 Compact Balanced Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
              
              {sametelJobs.map((job, index) => {
                // Responsive column span: 3 cards on row 1 (2 cols each), 2 cards on row 2 (3 cols each) on lg screens
                const colSpanClass = index < 3 
                  ? 'md:col-span-3 lg:col-span-2' 
                  : (index === 3 ? 'md:col-span-3 lg:col-span-3' : 'md:col-span-6 lg:col-span-3');

                return (
                  <div 
                    key={job.id}
                    className={`bg-white rounded-2xl p-6 border transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-lg hover:-translate-y-1 relative group h-full ${colSpanClass} ${
                      selectedJobId === job.id ? 'border-blue-600 ring-2 ring-blue-600/15' : 'border-slate-200/90 hover:border-blue-400'
                    }`}
                  >
                    <div className="space-y-4">
                      
                      {/* Top row: Code & Badges */}
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                          Vị trí {job.code}
                        </span>
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                          <span className="material-symbols-outlined text-xs text-blue-600">group</span>
                          {job.quantity}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                          <span className="material-symbols-outlined text-xs text-rose-500">location_on</span>
                          {job.locationText}
                        </span>
                      </div>
                    </div>

                    {/* Job Title */}
                    <div>
                      <h3 className="font-display-lg text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors leading-snug line-clamp-2 min-h-[48px]">
                        {job.title}
                      </h3>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-slate-400">schedule</span>
                        <span>{job.workType}</span>
                      </div>
                    </div>

                    {/* Salary Box — Guaranteed 1 Single Line */}
                    <div className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-blue-50/90 to-indigo-50/70 border border-blue-100/90 flex items-center justify-between gap-2 overflow-hidden">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">Thu nhập:</span>
                      <span className="text-xs sm:text-[13px] font-extrabold text-blue-900 whitespace-nowrap text-right">
                        {job.cardSalary || job.salary}
                      </span>
                    </div>

                    {/* Short Highlight feature */}
                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-start gap-2">
                      <span className="material-symbols-outlined text-sm text-amber-600 shrink-0 mt-0.5">verified</span>
                      <span className="leading-relaxed">{job.highlight}</span>
                    </div>

                  </div>

                  {/* Actions buttons */}
                  <div className="pt-4 mt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
                    
                    {/* View JD Button -> Opens Modal */}
                    <button
                      onClick={() => handleOpenJdModal(job)}
                      className="w-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-bold text-xs py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200/80 hover:border-blue-300"
                    >
                      <span className="material-symbols-outlined text-base">visibility</span>
                      <span>Xem JD</span>
                    </button>

                    {/* Apply Button -> Scrolls to form */}
                    <button
                      onClick={() => handleSelectJobAndScroll(job.title, job.id, job.locations[0])}
                      className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow-sm shadow-blue-700/20 active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>Ứng tuyển</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>

                  </div>

                </div>
                );
              })}

            </div>

            {/* Note text under cards */}
            <div className="mt-8 text-center text-xs text-slate-500">
              * Toàn bộ điều kiện, lương và quyền lợi bám sát theo tiêu chuẩn tuyển dụng chính thức của SAMETEL.
            </div>

          </div>
        </section>

        {/* FULL JD POP-UP MODAL */}
        {activeModalJob && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setActiveModalJob(null)}
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
                  onClick={() => setActiveModalJob(null)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
                  title="Đóng cửa sổ"
                >
                  <span className="material-symbols-outlined text-2xl">close</span>
                </button>
              </div>

              {/* Modal Scrollable Body */}
              <div className="p-6 sm:p-8 overflow-y-auto space-y-8 text-slate-700 text-sm sm:text-base leading-relaxed">
                
                {/* 1. MÔ TẢ CÔNG VIỆC */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="material-symbols-outlined text-blue-700 text-2xl">description</span>
                    <h3 className="font-display-lg text-lg font-bold text-slate-900">
                      MÔ TẢ CÔNG VIỆC (JOB DESCRIPTION)
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
                      YÊU CẦU ỨNG VIÊN (JOB REQUIREMENTS)
                    </h3>
                  </div>
                  <ul className="space-y-2.5 pl-1">
                    {activeModalJob.requirements.map((req, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-600">
                        <span className="material-symbols-outlined text-base text-emerald-600 mt-0.5 shrink-0">check_circle</span>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 3. QUYỀN LỢI ĐƯỢC HƯỞNG */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="material-symbols-outlined text-blue-700 text-2xl">card_giftcard</span>
                    <h3 className="font-display-lg text-lg font-bold text-slate-900">
                      QUYỀN LỢI ĐƯỢC HƯỞNG (BENEFITS)
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

                {/* 4. ĐỊA ĐIỂM & THỜI GIAN LÀM VIỆC */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="material-symbols-outlined text-blue-700 text-2xl">apartment</span>
                    <h3 className="font-display-lg text-lg font-bold text-slate-900">
                      ĐỊA ĐIỂM &amp; THỜI GIAN LÀM VIỆC
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Hanoi Office */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                      <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                        <span className="material-symbols-outlined text-base">location_on</span>
                        <span>Hanoi Office:</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-6">
                        9th Floor, Millennium Building, <br />
                        4 Quang Trung, Ha Dong District, Hanoi.
                      </p>
                    </div>

                    {/* HCM Office */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                      <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                        <span className="material-symbols-outlined text-base">location_on</span>
                        <span>Ho Chi Minh Office:</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-6">
                        6th Floor, DHG Building, 31-33 <br />
                        Street 18, Thong Tay Hoi Ward, Ho Chi Minh City.
                      </p>
                    </div>
                  </div>

                  {/* Working Hours */}
                  <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                    <span className="material-symbols-outlined text-lg text-blue-600 shrink-0 mt-0.5">schedule</span>
                    <div>
                      <strong className="text-blue-900 font-bold">Thời gian làm việc:</strong> Thứ 2 – Thứ 6, Thứ 7 làm buổi sáng (Nghỉ chiều Thứ 7 &amp; Chủ Nhật).
                    </div>
                  </div>
                </div>

              </div>

              {/* Modal Footer CTA */}
              <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModalJob(null)}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-100 transition-colors cursor-pointer text-center"
                >
                  Đóng lại
                </button>
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

        {/* SECTION 4 — ĐIỀU GÌ ĐANG CHỜ BẠN TẠI SAMETEL? */}
        <section className="py-20 bg-white border-b border-slate-100" id="benefits">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                Phúc Lợi &amp; Phát Triển
              </span>
              <h2 className="font-display-lg text-3xl sm:text-4xl font-extrabold text-slate-900">
                Điều gì đang chờ bạn tại SAMETEL?
              </h2>
              <p className="text-slate-600 text-base sm:text-lg">
                Một hệ sinh thái công việc gắn liền với các giải pháp Solar – BESS – Inverter thực tế hàng đầu thị trường.
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
                  Tham gia đầy đủ BHXH, BHYT, BHTN theo đúng quy định pháp luật và chính sách từng vị trí của công ty niêm yết.
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
                  Lộ trình phát triển minh bạch lên Team Lead, Giám đốc Kinh doanh (CCO) hoặc Giám đốc Kỹ thuật (Technical Director).
                </p>
              </div>

            </div>

          </div>
        </section>

        {/* SECTION 5 — FORM ỨNG TUYỂN */}
        <section className="py-20 sm:py-28 bg-[#F8FAFC]" id="apply" ref={formRef}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden">
              
              {/* Form Header */}
              <div className="bg-gradient-to-r from-blue-800 to-indigo-900 text-white p-8 sm:p-10 text-center relative overflow-hidden">
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-cyan-400/10 rounded-full blur-2xl"></div>
                <div className="relative z-10 space-y-3">
                  <span className="inline-block text-xs font-bold uppercase tracking-wider text-cyan-300 bg-white/10 px-3 py-1 rounded-full border border-white/20">
                    Cổng Tiếp Nhận Hồ Sơ
                  </span>
                  <h2 className="font-display-lg text-2xl sm:text-3xl font-extrabold text-white">
                    TÌM THẤY VỊ TRÍ PHÙ HỢP? <br />
                    GỬI THÔNG TIN CHO SAMETEL
                  </h2>
                  <p className="text-sm sm:text-base text-blue-100 max-w-xl mx-auto">
                    Điền đầy đủ thông tin bên dưới để ứng tuyển trực tiếp đến Ban Tuyển dụng SAMETEL.
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
                        Nộp hồ sơ thành công!
                      </h3>
                      <p className="text-slate-600 text-sm sm:text-base max-w-md mx-auto">
                        Cảm ơn bạn đã ứng tuyển vào vị trí <strong>{formData.position}</strong> tại SAMETEL. Chúng tôi sẽ phản hồi lại bạn sớm nhất có thể.
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

                      {/* Field 4: Vị trí muốn ứng tuyển */}
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
                          <option value="Ứng tuyển vị trí khác">Khác (Ứng tuyển tự do)</option>
                        </select>
                      </div>

                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      
                      {/* Field 5: Khu vực muốn làm việc */}
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
                          <option value="TP.HCM">TP. Hồ Chí Minh</option>
                          <option value="Đà Nẵng">Đà Nẵng</option>
                          <option value="Hà Đông, Hà Nội">Hà Đông, Hà Nội</option>
                          <option value="Đồng Nai (Nhà máy Long Thành)">Đồng Nai (Nhà máy Long Thành)</option>
                        </select>
                      </div>

                      {/* Field 6: Số năm kinh nghiệm */}
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">
                          Số năm kinh nghiệm
                        </label>
                        <select
                          name="experience"
                          value={formData.experience}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition-all font-medium text-slate-800"
                        >
                          <option value="Dưới 1 năm / Mới tốt nghiệp">Dưới 1 năm / Mới tốt nghiệp</option>
                          <option value="1–2 năm">1–2 năm</option>
                          <option value="3–5 năm">3–5 năm</option>
                          <option value="Trên 5 năm">Trên 5 năm</option>
                        </select>
                      </div>

                    </div>

                    {/* Field 7: Upload CV */}
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 flex items-center justify-between">
                        <span>Tải lên CV (PDF / DOCX) <span className="text-red-500">*</span></span>
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
                          accept=".pdf,.doc,.docx"
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
                                <span className="font-bold text-blue-700">Nhấp để chọn file CV</span> hoặc kéo thả vào đây
                              </div>
                              <p className="text-xs text-slate-400">
                                Định dạng hỗ trợ: PDF, DOC, DOCX
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
                        placeholder="Hãy chia sẻ ngắn gọn về kinh nghiệm hoặc lý do bạn muốn đồng hành cùng SAMETEL..."
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
                      🔒 Thông tin của ứng viên chỉ được sử dụng cho mục đích tuyển dụng. Bộ phận tuyển dụng SAMETEL sẽ liên hệ với các hồ sơ phù hợp.
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
            
            <h2 className="font-display-lg text-2xl sm:text-4xl lg:text-5xl font-extrabold leading-tight">
              CƠ HỘI MỚI TRONG NGÀNH SOLAR – BESS ĐANG CHỜ BẠN
            </h2>
            
            <p className="text-base sm:text-lg text-blue-100 max-w-2xl mx-auto leading-relaxed">
              Đừng chỉ tìm một công việc mới. Hãy tìm một vị trí phù hợp để tiếp tục phát triển kinh nghiệm, thu nhập và sự nghiệp của bạn.
            </p>

            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 inline-block max-w-xl">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-cyan-300">
                SAMETEL – Cam kết • Tuân thủ • Chuyên nghiệp • Trách nhiệm
              </span>
            </div>

            <div className="pt-2">
              <button
                onClick={() => handleSelectJobAndScroll('Trưởng Phòng Phân Phối (Distribution Manager)', 'distribution-manager')}
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
            <img 
              src="/logoandfavi/sametel_logo.png" 
              alt="SAMETEL Logo" 
              className="h-12 w-auto object-contain rounded" 
            />
            <p className="text-xs text-slate-500 leading-relaxed">
              <strong className="text-slate-800 font-bold">CÔNG TY CỔ PHẦN SAMETEL</strong>
              <br />
              Mã chứng khoán: <span className="font-bold text-blue-700">SMT (Sàn HNX)</span>
              <br />
              Doanh nghiệp uy tín hàng đầu trong lĩnh vực Điện – Viễn thông – Năng lượng mặt trời Solar &amp; BESS.
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
                <span className="material-symbols-outlined text-base text-blue-700">call</span>
                <a href="tel:02513514888" className="hover:text-blue-700 font-bold text-slate-800">0251 3514 888</a>
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-blue-700">mail</span>
                <a href={`mailto:${HR_EMAIL}`} className="hover:text-blue-700 font-medium">{HR_EMAIL}</a>
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-blue-700">language</span>
                <a href="https://sametel.com.vn" target="_blank" rel="noopener noreferrer" className="hover:text-blue-700">www.sametel.com.vn</a>
              </li>
            </ul>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 gap-2">
          <div>
            © 2026 SAMETEL. Power of future. Bảo lưu mọi quyền.
          </div>
          <div>
            Website Tuyển dụng Chính thức SAMETEL
          </div>
        </div>
      </footer>

    </div>
  );
}

export default App;
