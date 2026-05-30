import { useState, type ReactNode } from "react";
import { PluggyConnect } from "react-pluggy-connect";
import { Button } from "../../components/ui/Button";
import { useConnectToken } from "./saldo-banco.api";

type Props = {
  children: ReactNode;
  onItem: (itemId: string) => void; // chamado com o itemId que o widget devolve no sucesso
  variant?: "primary" | "ghost" | "outline";
};

// botao que abre o widget do Pluggy: busca o connect token no backend e, com ele em maos,
// renderiza o <PluggyConnect/>. as credenciais do banco ficam 100% dentro do widget; aqui
// so recebemos o itemId da conexao no onSuccess. sandbox so aparece em dev (import.meta.env.DEV).
export function BankConnectButton({ children, onItem, variant = "primary" }: Props) {
  const connectToken = useConnectToken();
  const [token, setToken] = useState<string | null>(null);

  function open() {
    connectToken.mutate(undefined, { onSuccess: (data) => setToken(data.connectToken) });
  }

  return (
    <>
      <Button
        variant={variant}
        onPress={open}
        isPending={connectToken.isPending}
        isDisabled={connectToken.isPending}
      >
        {children}
      </Button>

      {connectToken.isError && (
        <p className="mt-2 text-xs text-negative">Nao foi possivel iniciar a conexao. Tente de novo.</p>
      )}

      {token && (
        <PluggyConnect
          connectToken={token}
          includeSandbox={import.meta.env.DEV}
          theme="dark"
          onSuccess={({ item }) => {
            setToken(null);
            onItem(item.id);
          }}
          onError={() => setToken(null)}
          onClose={() => setToken(null)}
        />
      )}
    </>
  );
}
