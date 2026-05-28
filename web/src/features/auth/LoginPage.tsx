import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Apple, ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Checkbox } from "../../components/ui/Checkbox";
import { TextField } from "../../components/ui/TextField";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { useLogin } from "./auth.api";

export function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    login.mutate(
      { email, password, remember },
      { onSuccess: () => navigate({ to: "/" }) },
    );
  }

  return (
    <AuthLayout>
      <Card className="p-8">
        <h2 className="text-3xl font-light tracking-tighter">Entrar</h2>
        <p className="mt-1 text-sm text-muted">Acesse sua conta Mira</p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
          <TextField
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="seu@email.com"
            value={email}
            onChange={setEmail}
            isRequired
          />
          <TextField
            label="Senha"
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            placeholder="Sua senha"
            value={password}
            onChange={setPassword}
            isRequired
            endSlot={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-faint transition hover:text-muted"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            }
          />

          <div className="flex items-center justify-between">
            <Checkbox isSelected={remember} onChange={setRemember}>
              Lembrar de mim
            </Checkbox>
            <button type="button" className="text-sm text-brand transition hover:text-brand-dark">
              Esqueceu a senha?
            </button>
          </div>

          {login.isError && (
            <p className="text-sm text-negative">{login.error.message}</p>
          )}

          <Button type="submit" isPending={login.isPending} isDisabled={login.isPending}>
            {login.isPending ? "Entrando..." : "Entrar"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <div className="my-6 flex items-center gap-4 text-xs text-faint">
          <span className="h-px flex-1 bg-border" />
          ou continue com
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="flex flex-col gap-3">
          <Button variant="outline" isDisabled>
            <GoogleIcon /> Continuar com Google
          </Button>
          <Button variant="outline" isDisabled>
            <Apple className="h-4 w-4" /> Continuar com Apple
          </Button>
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          Não tem uma conta?{" "}
          <Link to="/signup" className="text-brand transition hover:text-brand-dark">
            Criar conta
          </Link>
        </p>

        <p className="mt-8 flex items-center justify-center gap-2 text-xs text-faint">
          <ShieldCheck className="h-3.5 w-3.5" />
          Seus dados são protegidos com criptografia de ponta a ponta.
        </p>
      </Card>
    </AuthLayout>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.27-4.74 3.27-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
