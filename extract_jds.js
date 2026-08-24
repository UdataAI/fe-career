import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const jdDir = './JD';
const publicJdDir = './public/JD';
const outputDir = './src/data';
const outputFile = path.join(outputDir, 'jds.json');

function toSafeFilename(filename) {
  let safe = filename.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
  
  safe = safe.replace(/&/g, 'and')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_.-]/g, '');
  
  return safe;
}

function extractJDs() {
  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    if (!fs.existsSync(jdDir)) {
      fs.mkdirSync(jdDir, { recursive: true });
    }
    if (!fs.existsSync(publicJdDir)) {
      fs.mkdirSync(publicJdDir, { recursive: true });
    } else {
      // Clear existing pdf files to avoid leftover files with bad encoding
      const existingFiles = fs.readdirSync(publicJdDir).filter(file => file.endsWith('.pdf'));
      for (const file of existingFiles) {
        fs.unlinkSync(path.join(publicJdDir, file));
      }
    }

    const files = fs.readdirSync(jdDir).filter(file => file.endsWith('.pdf'));
    const jdData = [];

    for (const file of files) {
      console.log(`Processing file via CLI: ${file}`);
      const filePath = path.join(jdDir, file);
      
      const safeFile = toSafeFilename(file);
      fs.copyFileSync(filePath, path.join(publicJdDir, safeFile));
      
      // Run the CLI command to extract text
      const stdout = execSync(`npx pdf-parse text "${filePath}"`, { encoding: 'utf-8' });
      
      let title = '';
      let category = 'Engineering';
      let location = 'Hà Nội';
      let type = 'Toàn thời gian';

      if (file.includes('Intern Consultant')) {
        title = 'Business Development & Solution Consultant Intern';
        category = 'Sales';
        type = 'Thực tập';
      } else if (file.includes('Consultant')) {
        title = 'Business Development & Solution Consultant';
        category = 'Sales';
      } else if (file.includes('Kế toán')) {
        title = 'Kế toán & Hành chính tổng hợp';
        category = 'Backoffice';
      } else if (file.includes('MKT_Intern')) {
        title = 'Marketing Intern';
        category = 'Marketing';
        type = 'Thực tập';
      } else if (file.includes('Performance Marketing')) {
        title = 'Performance Marketing Executive';
        category = 'Marketing';
      } else if (file.includes('Kỹ sư triển khai') || file.includes('Ky_su_trien_khai')) {
        title = 'Kỹ sư Triển khai';
        category = 'Engineering';
      } else if (file.includes('Fullstack') || file.includes('fullstack')) {
        title = 'Fullstack Engineer';
        category = 'Engineering';
      } else {
        title = file.replace('Udata_JD_', '').replace('_HaNoi.pdf', '').replace('_Hanoi.pdf', '').replace('.pdf', '');
      }

      const lines = stdout.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      const sections = {
        about: '',
        duties: [],
        requirements: [],
        benefits: [],
        locationAndTime: ''
      };

      let currentSection = '';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip running headers/footers
        if (line.startsWith('--') && line.endsWith('--')) {
          continue;
        }
        if (line.toLowerCase().includes('digital & green transformation with udata')) {
          continue;
        }

        // Check if header
        const normalizedLine = line.toUpperCase();
        
        if (normalizedLine.includes('VỀ UDATA') || normalizedLine.includes('ABOUT UDATA')) {
          currentSection = 'about';
          continue;
        } else if (normalizedLine.includes('VAI TRÒ') || normalizedLine.includes('TRÁCH NHIỆM') || normalizedLine.includes('MÔ TẢ CÔNG VIỆC') || normalizedLine.includes('BẠN SẼ LÀM GÌ') || normalizedLine.includes('WHAT WILL YOU DO?')) {
          currentSection = 'duties';
          continue;
        } else if (normalizedLine.includes('KỸ NĂNG') || normalizedLine === 'YÊU CẦU' || normalizedLine.includes('YÊU CẦU ỨNG VIÊN') || normalizedLine.includes('REQUIREMENTS')) {
          currentSection = 'requirements';
          continue;
        } else if (normalizedLine.includes('QUYỀN LỢI') || normalizedLine.includes('WHAT WILL YOU GAIN') || normalizedLine.includes('PERKS') || normalizedLine.includes('BENEFITS')) {
          currentSection = 'benefits';
          continue;
        } else if (normalizedLine.includes('THỜI GIAN') || normalizedLine.includes('ĐỊA ĐIỂM LÀM VIỆC') || normalizedLine.includes('ĐỊA ĐIỂM & GIỜ LÀM VIỆC') || normalizedLine.includes('ĐỊA ĐIỂM VÀ GIỜ LÀM VIỆC') || normalizedLine.includes('LOCATION AND TIME')) {
          currentSection = 'locationAndTime';
          continue;
        }

        if (currentSection === 'about') {
          if (line.includes('Các sản phẩm chủ lực:') || line.includes('Sản phẩm của chúng tôi:') || line.includes('Our Core Products') || line.includes('Sản phẩm bạn sẽ xây dựng')) {
            currentSection = '';
          } else {
            sections.about += (sections.about ? ' ' : '') + line;
          }
        } else if (currentSection === 'duties') {
          // If it's a numbered section header like "1. Triển khai dự án:" - treat it as a section label, not a bullet
          if (/^\d+\.\s+[^\d]/.test(line) && line.endsWith(':')) {
            sections.duties.push(line); // keep as header
          } else if (line.startsWith('•') || line.startsWith('-') || line.startsWith('–') || line.startsWith('+') || line.startsWith('o') || /^\d+\./.test(line)) {
            sections.duties.push(line.replace(/^[•\-–+o]\s*/, '').replace(/^\d+\.\s*/, ''));
          } else if (sections.duties.length > 0) {
            sections.duties[sections.duties.length - 1] += ' ' + line;
          } else {
            sections.duties.push(line);
          }
        } else if (currentSection === 'requirements') {
          if (line.startsWith('•') || line.startsWith('-') || line.startsWith('–') || line.startsWith('+') || line.startsWith('o') || /^\d+\./.test(line)) {
            sections.requirements.push(line.replace(/^[•\-–+o]\s*/, '').replace(/^\d+\.\s*/, ''));
          } else if (sections.requirements.length > 0) {
            sections.requirements[sections.requirements.length - 1] += ' ' + line;
          } else {
            sections.requirements.push(line);
          }
        } else if (currentSection === 'benefits') {
          if (line.startsWith('•') || line.startsWith('-') || line.startsWith('–') || line.startsWith('+') || line.startsWith('o') || /^\d+\./.test(line)) {
            sections.benefits.push(line.replace(/^[•\-–+o]\s*/, '').replace(/^\d+\.\s*/, ''));
          } else if (sections.benefits.length > 0) {
            sections.benefits[sections.benefits.length - 1] += ' ' + line;
          } else {
            sections.benefits.push(line);
          }
        } else if (currentSection === 'locationAndTime') {
          sections.locationAndTime += (sections.locationAndTime ? ' \n' : '') + line;
        }
      }

      // Fallbacks
      const fallbackAbout = 'Udata là công ty công nghệ chuyên cung cấp giải pháp chuyển đổi xanh và chuyển đổi số cho doanh nghiệp, dựa trên nền tảng AI và AIoT. Chúng tôi đồng hành cùng các nhà máy, tòa nhà và khu công nghiệp trong hành trình số hóa vận hành, tối ưu năng lượng và hướng tới phát triển bền vững.';
      
      jdData.push({
        id: safeFile.replace(/Udata_JD_/, '').replace(/\.pdf$/, ''),
        filename: safeFile,
        title,
        category,
        location,
        type,
        about: sections.about.trim() || fallbackAbout,
        duties: sections.duties.map(d => d.trim()).filter(d => d.length > 0),
        requirements: sections.requirements.map(r => r.trim()).filter(r => r.length > 0),
        benefits: sections.benefits.map(b => b.trim()).filter(b => b.length > 0),
        locationAndTime: sections.locationAndTime.trim() || 'Hà Nội'
      });
    }

    // Post-processing cleanup for specific jobs to ensure perfect formatting
    const cleanedJdData = jdData.map(jd => {
      if (jd.id === 'Intern_Consultant_Hanoi') {
        return {
          ...jd,
          duties: [
            "Research: Find CFO/CEO leads in the Singapore & APAC market",
            "Outreach: Message decision-makers via LinkedIn and Email",
            "Book Meetings/Demos: Schedule 20-minute intro calls for the Sales team"
          ],
          requirements: [
            "Final-year students or fresh graduates in Business, Marketing, Information Technology, Management, International Business or related fields.",
            "Strong English: Confident in professional writing and speaking (Mandatory).",
            "Tech-curious: Interested in Fintech, AI, and SaaS.",
            "Proactive: High energy, resilient, and not afraid to reach out to executives.",
            "Chúng tôi tìm người có tinh thần: Proactive & creative, curious about new technologies, not afraid to try and improve from mistakes, eager to build a real portfolio, excited to grow together with a startup."
          ],
          benefits: [
            "Global Exposure: Work directly with the Singapore market.",
            "Training: Learn B2B sales from experts.",
            "Incentives: Bonus for every qualified meeting booked.",
            "Hands-on training in B2B sales, Business development, AI & IoT solutions, and Enterprise consulting skills.",
            "Opportunity to work directly with a fast-growing tech startup.",
            "Exposure to real enterprise projects.",
            "Potential opportunity for full-time employment after the internship.",
            "Young, dynamic, and fast-learning working environment."
          ],
          locationAndTime: "• Hanoi: 9th Floor – Ha Tay Millennium, No. 4 Quang Trung, Ha Dong, Ha Noi \n• Mon – Fri: 8:00 – 17:00 \n• Minimum internship duration: 3 months"
        };
      }
      return jd;
    });

    fs.writeFileSync(outputFile, JSON.stringify(cleanedJdData, null, 2), 'utf-8');
    console.log(`Successfully extracted ${cleanedJdData.length} JDs to ${outputFile}`);
  } catch (error) {
    console.error('Error extracting JDs:', error);
  }
}

extractJDs();
