import { useState } from "react";
import { Building2, RefreshCw, ShieldCheck } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { formatBRL } from "../../lib/format";
import { BankConnectButton } from "./BankConnectButton";
import { BalanceProjectionCard } from "./BalanceProjectionCard";
import {
  useBankState,
  useConnectBank,
  useDisconnectBank,
  useSyncBank,
} from "./saldo-banco.api";

// "2026-05-30T13:00:00Z" -> "30/05 13:00"
function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// status do item que exigem o usuario reconectar (erro de login ou verificacao extra)
function reconnectMessage(status: string): string | null {
  if (status === "LOGIN_ERROR") return "O banco recusou o login. Reconecte para atualizar o saldo.";
  if (status === "WAITING_USER_INPUT") return "O banco pediu uma verificacao extra. Reconecte para concluir.";
  return null;
}

export function SaldoBancoPage() {
  const { data, isLoading } = useBankState();
  const connectBank = useConnectBank();
  const sync = useSyncBank();
  const disconnect = useDisconnectBank();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-light tracking-tighter text-heading">Saldo no banco</h1>
        <p className="mt-2 text-sm font-light text-muted">
          Conecte seu banco pra puxar o saldo automaticamente e ver a projecao de como ele fecha o
          mes, a partir dos seus ganhos e gastos.
        </p>
      </div>

      {isLoading ? (
        <Card className="p-6">
          <p className="text-sm text-muted">Carregando...</p>
        </Card>
      ) : !data?.connected ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <Building2 className="h-8 w-8 text-faint" />
          <p className="text-sm text-muted">Nenhum banco conectado.</p>
          <p className="flex max-w-sm items-center justify-center gap-1.5 text-xs text-faint">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            Conexao segura via Open Finance. Suas credenciais ficam no banco, a Mira so le o saldo.
          </p>
          <div className="mt-2 flex flex-col items-center gap-2">
            <BankConnectButton onItem={(itemId) => connectBank.mutate(itemId)}>
              Conectar meu banco
            </BankConnectButton>
            {connectBank.isPending && <p className="text-xs text-muted">Conectando...</p>}
            {connectBank.isError && (
              <p className="text-xs text-negative">Nao foi possivel conectar. Tente de novo.</p>
            )}
          </div>
        </Card>
      ) : (
        <>
          <Card className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm text-muted">
                  <Building2 className="h-4 w-4 text-faint" />
                  {data.institutionName ?? "Banco conectado"}
                </p>
                <p className="tnum mt-2 text-4xl font-light tracking-tighter text-heading">
                  {formatBRL(data.currentBalance)}
                </p>
                <p className="mt-1 text-xs text-faint">
                  Saldo de hoje
                  {data.currentBalanceAt ? ` · atualizado ${formatDateTime(data.currentBalanceAt)}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <Button
                  variant="outline"
                  onPress={() => sync.mutate()}
                  isPending={sync.isPending}
                  isDisabled={sync.isPending}
                  className="px-3 py-2 text-xs"
                >
                  <RefreshCw className="h-4 w-4" />
                  {sync.isPending ? "Sincronizando..." : "Sincronizar"}
                </Button>
                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  className="text-xs text-faint transition hover:text-negative"
                >
                  Desconectar
                </button>
              </div>
            </div>

            {sync.isError && (
              <p className="mt-3 text-xs text-negative">
                Nao foi possivel sincronizar agora. Tente de novo em instantes.
              </p>
            )}

            {reconnectMessage(data.status) && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-negative/30 bg-negative/10 px-4 py-3">
                <p className="text-xs text-negative">{reconnectMessage(data.status)}</p>
                <BankConnectButton variant="outline" onItem={(itemId) => connectBank.mutate(itemId)}>
                  Reconectar
                </BankConnectButton>
              </div>
            )}
          </Card>

          <BalanceProjectionCard state={data} />
        </>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Desconectar banco"
        description="Isso remove a conexao com o banco e o historico de saldos. Voce pode reconectar depois. Deseja continuar?"
        confirmLabel="Desconectar"
        isPending={disconnect.isPending}
        onConfirm={() => disconnect.mutate(undefined, { onSuccess: () => setConfirmOpen(false) })}
      />
    </div>
  );
}
