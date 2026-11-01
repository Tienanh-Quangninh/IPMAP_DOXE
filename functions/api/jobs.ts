import { branches, jobs, json, route } from '../../shared/server';
export const onRequest = route('GET', ({ request }) => {
  const id = new URL(request.url).searchParams.get('branchId');
  const branch = branches.find((b) => b.id === id && b.recruitmentEnabled);
  return json({ jobs: branch ? jobs.filter((j) => j.branchId === branch.id && j.active) : [] });
});
