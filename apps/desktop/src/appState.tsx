// 앱 상태 폴링과 공용 접근. 제어 서비스의 /state 를 주기적으로 갱신하고
// 로딩/실패/재시도 상태를 화면에 제공한다. 모든 데이터는 제어 서비스의 state에서 오며
// UI가 임의로 만들어내지 않는다.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api } from './api';
import type { ApiError, AppState } from '../../../packages/domain';

type Phase = 'connecting' | 'ready' | 'error';

interface AppStateContextValue {
  state: AppState | null;
  phase: Phase;
  error: ApiError | null;
  lastUpdatedAt: number | null;
  refreshing: boolean;
  // 명시적 새로고침. 액션 이후 호출해 결과를 반영한다.
  refresh: () => Promise<void>;
}

const Ctx = createContext<AppStateContextValue | null>(null);

// 활성 작업이 있으면 더 자주, 없으면 천천히 폴링한다.
const POLL_ACTIVE_MS = 3000;
const POLL_IDLE_MS = 9000;
// 컨트롤러가 준비되지 않았을 때(초기 기동) 재시도 간격.
const RETRY_MS = 1500;

function hasActiveWork(state: AppState | null): boolean {
  if (!state) return false;
  return state.runs.some(
    (r) =>
      r.status === 'queued' ||
      r.status === 'running' ||
      r.status === 'retry_wait' ||
      r.status === 'waiting_external',
  );
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [phase, setPhase] = useState<Phase>('connecting');
  const [error, setError] = useState<ApiError | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  const load = useCallback(async (isManual: boolean) => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (isManual) setRefreshing(true);
    const res = await api.getState();
    if (!mounted.current) {
      inFlight.current = false;
      return;
    }
    if (res.ok) {
      setState(res.data);
      setPhase('ready');
      setError(null);
      setLastUpdatedAt(Date.now());
    } else {
      // 컨트롤러 미준비는 일시 상태로 두고 빠르게 재시도한다.
      if (res.error.code === 'controller_unavailable' || res.error.code === 'network_error') {
        setPhase((prev) => (prev === 'ready' ? 'ready' : 'connecting'));
      } else {
        setPhase('error');
      }
      setError(res.error);
    }
    if (isManual) setRefreshing(false);
    inFlight.current = false;
  }, []);

  const scheduleNext = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    let interval: number;
    if (phase === 'connecting') interval = RETRY_MS;
    else if (hasActiveWork(state)) interval = POLL_ACTIVE_MS;
    else interval = POLL_IDLE_MS;
    timer.current = setTimeout(() => {
      void load(false).then(scheduleNext);
    }, interval);
  }, [load, phase, state]);

  useEffect(() => {
    mounted.current = true;
    void load(false).then(scheduleNext);
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
    // 최초 1회만 실행. scheduleNext는 phase/state 변화에 따라 아래 effect로 재조정.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // phase/state가 바뀌면 폴링 간격을 재조정한다.
  useEffect(() => {
    scheduleNext();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [scheduleNext]);

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  return (
    <Ctx.Provider
      value={{ state, phase, error, lastUpdatedAt, refreshing, refresh }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAppState(): AppStateContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('AppStateProvider 밖에서 useAppState를 사용했습니다.');
  return ctx;
}
