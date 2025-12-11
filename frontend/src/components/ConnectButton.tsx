type Props = {
  onConnect: () => void;
  disabled?: boolean;
};

export function ConnectButton({ onConnect, disabled }: Props) {
  return (
    <button className="btn btn-primary" onClick={onConnect} disabled={disabled}>
      Conectar WhatsApp
    </button>
  );
}
