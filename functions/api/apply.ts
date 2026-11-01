import {
  dispatchEvent,
  readBody,
  route,
  serverTime,
  validateApplication,
} from '../../shared/server';
import { branchGoogleMaps, googleMapsSearch } from '../../shared/maps';
export const onRequest = route('POST', async (context) => {
  const input = validateApplication(await readBody(context.request));
  const {
    turnstileToken,
    eventId,
    branch,
    province,
    job,
    name,
    birthYear,
    phone,
    education,
    experience,
    skills,
    vehicle,
  } = input;
  const labels: Record<string, string> = {
    none: 'Không có',
    THCS: 'THCS',
    THPT: 'THPT',
    college: 'Cao đẳng / Trung cấp',
    university: 'Đại học',
  };
  return dispatchEvent(context, {
    kind: 'JOB_APPLICATION',
    eventId,
    turnstileToken,
    payload: {
      branchId: branch?.id || null,
      province,
      jobId: job.id,
      name,
      birthYear,
      phone,
      education,
      experience,
      skills,
      vehicle,
      submitted: true,
    },
    message: `🛠️ HỒ SƠ ỨNG TUYỂN MỚI\nMã hồ sơ: ${eventId}\nChi nhánh: ${branch?.name || 'Tiếp nhận tuyển dụng toàn quốc'}\nVị trí: ${job.title}\nHọ tên: ${name}\nNăm sinh: ${birthYear}\nĐiện thoại: ${phone}\nHọc vấn: ${labels[education]}\nKinh nghiệm: ${experience} năm\nNhóm xe: ${vehicle === 'motorcycle' ? 'Xe máy' : 'Ô tô'}\nKỹ năng: ${skills}\n\nTHÔNG TIN TIẾP NHẬN\nThời gian: ${serverTime()}\nKhu vực chi nhánh: ${province}\nBản đồ khu vực: ${googleMapsSearch(province + ', Việt Nam')}${branch ? '\nGoogle Maps chi nhánh: ' + branchGoogleMaps(branch) : ''}\nNguồn: Website tuyển dụng\nTrạng thái: Đã gửi hồ sơ`,
  });
});
