import {
  describeClient,
  dispatchEvent,
  readBody,
  route,
  serverTime,
  validateApplication,
} from '../../shared/server';
export const onRequest = route('POST', async (context) => {
  const input = validateApplication(await readBody(context.request));
  const {
    turnstileToken,
    eventId,
    branch,
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
      branchId: branch.id,
      jobId: job.id,
      name,
      birthYear,
      phone,
      education,
      experience,
      skills,
      vehicle,
      consent: true,
    },
    message: `🛠️ HỒ SƠ ỨNG TUYỂN MỚI\nMã hồ sơ: ${eventId}\nChi nhánh: ${branch.name}\nVị trí: ${job.title}\nHọ tên: ${name}\nNăm sinh: ${birthYear}\nĐiện thoại: ${phone}\nHọc vấn: ${labels[education]}\nKinh nghiệm: ${experience} năm\nNhóm xe: ${vehicle === 'motorcycle' ? 'Xe máy' : 'Ô tô'}\nKỹ năng: ${skills}\n\nTHÔNG TIN TIẾP NHẬN\nThời gian: ${serverTime()}\nIP: ${context.request.headers.get('CF-Connecting-IP') || 'Không có'}\nThiết bị: ${describeClient(context.request)}\nKhu vực chi nhánh: ${branch.province}\nNguồn: Website tuyển dụng\nTrạng thái: Đã đồng ý gửi hồ sơ và thông tin tiếp nhận`,
  });
});
