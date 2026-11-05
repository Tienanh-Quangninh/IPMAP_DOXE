import { useCallback, useEffect, useRef, useState } from 'react';
import {
  brandsFor,
  defaultVehicleFilters,
  findDemoVehicles,
  type VehicleFilters,
} from '../../shared/vehicle-search';
import { requestBrowserLocation, type SharedPosition } from './location';
import { sendEvent } from './events';
import { ApiError } from './api';

export function useVehicleFinder(
  province: string,
  _position: SharedPosition | null,
  onPosition?: (position: SharedPosition) => void,
) {
  const [filters, setFilters] = useState<VehicleFilters>({ ...defaultVehicleFilters, province });
  const [searched, setSearched] = useState<VehicleFilters | null>(null);
  const [pending, setPending] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [token, setToken] = useState(''),
    [reset, setReset] = useState(0);
  const sending = useRef(false);
  const requestVersion = useRef(0);
  const [locating, setLocating] = useState(false);
  useEffect(() => {
    if (province) setFilters((current) => (current.province ? current : { ...current, province }));
  }, [province]);
  useEffect(() => {
    if (!pending || !token || sending.current) return;
    sending.current = true;
    sendEvent('search', pending, token)
      .catch((reason: unknown) => {
        setError(
          reason instanceof ApiError && ['DELIVERY_UNKNOWN', 'NETWORK_ERROR'].includes(reason.code)
            ? 'Chưa xác định nhu cầu đã được tiếp nhận hay chưa. Vui lòng đợi trước khi thử lại.'
            : 'Đã hiển thị kết quả minh họa. Nhu cầu tư vấn chưa được tiếp nhận; bạn có thể thử tìm lại.',
        );
      })
      .finally(() => {
        sending.current = false;
        setBusy(false);
        setPending(null);
        setToken('');
      });
  }, [pending, token]);
  function update(patch: Partial<VehicleFilters>) {
    setFilters((current) => {
      const next = { ...current, ...patch };
      if (next.brand !== 'all' && !brandsFor(next.kind).includes(next.brand)) next.brand = 'all';
      return next;
    });
    setError('');
  }
  async function search() {
    if (busy) return false;
    if (filters.minPrice > filters.maxPrice) {
      setError('Giá từ phải nhỏ hơn hoặc bằng giá đến.');
      return false;
    }
    const snapshot = { ...filters };
    const version = ++requestVersion.current;
    setSearched(null);
    setError('');
    setBusy(true);
    setLocating(true);
    let position: SharedPosition;
    try {
      position = await requestBrowserLocation();
      if (version !== requestVersion.current) return false;
      onPosition?.(position);
    } catch {
      if (version !== requestVersion.current) return false;
      setError(
        'Chưa truy cập được vị trí. Hãy cho phép quyền vị trí trong trình duyệt rồi bấm tìm lại.',
      );
      setBusy(false);
      setLocating(false);
      return false;
    }
    setLocating(false);
    setSearched(snapshot);
    setToken('');
    setReset((n) => n + 1);
    setPending({
      ...snapshot,
      province: snapshot.province || null,
      position,
      locationShared: !!position,
      submitted: true,
    });
    setBusy(true);
    return true;
  }
  const cancelWaiting = useCallback(() => {
    if (!sending.current) {
      setPending(null);
      setBusy(false);
      setLocating(false);
      requestVersion.current++;
      setToken('');
    }
  }, []);
  return {
    filters,
    update,
    search,
    searched,
    results: searched ? findDemoVehicles(searched) : [],
    busy,
    locating,
    error,
    waiting: !!pending && !sending.current,
    token,
    setToken,
    reset,
    cancelWaiting,
  };
}
export type VehicleFinderController = ReturnType<typeof useVehicleFinder>;
