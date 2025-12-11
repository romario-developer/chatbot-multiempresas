import { ReactNode } from 'react';

type Props = {
  title: string;
  description?: string;
  open: boolean;
  onClose: () => void;
  children?: ReactNode;
};

export function Modal({ title, description, open, onClose, children }: Props) {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div className="card" style={{ width: 420 }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>{title}</div>
        {description && <div style={{ color: '#475569', marginTop: 4 }}>{description}</div>}
        <div style={{ marginTop: 12 }}>{children}</div>
        <div style={{ textAlign: 'right', marginTop: 12 }}>
          <button className="btn" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
