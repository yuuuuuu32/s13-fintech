import { ReactNode } from 'react';

/** 캔버스 래퍼: CSS로 확대/상단 이동만 담당 (카메라/물리 손대지 않음) */
export default function CanvasStage({ children }: { children: ReactNode }) {
  return <div className="canvas-stage">{children}</div>;
}
