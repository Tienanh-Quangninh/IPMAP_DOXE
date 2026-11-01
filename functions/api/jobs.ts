import { branches, jobs, json, route } from '../../shared/server';
export const onRequest = route('GET', ({ request }) => {
  const id = new URL(request.url).searchParams.get('branchId');
  const branch = branches.find((b) => b.id === id && b.recruitmentEnabled);
  return json({
    jobs: jobs.filter(
      (j) => j.active && (j.scope === 'national' || (branch && j.branchId === branch.id)),
    ),
  });
});
