import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { TextField } from "../../components/ui/TextField";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { useRegister } from "./auth.api";

export function SignupPage() {
  const navigate = useNavigate();
  const register = useRegister();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    register.mutate(
      { name, email, password },
      { onSuccess: () => navigate({ to: "/" }) },
    );
  }

  return (
    <AuthLayout>
      <Card className="p-8">
        <h2 className="text-3xl font-light tracking-tighter">Criar conta</h2>
        <p className="mt-1 text-sm text-muted">Comece a organizar suas finanças com a Mira</p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
          <TextField
            label="Nome"
            type="text"
            name="name"
            autoComplete="name"
            placeholder="Seu nome"
            value={name}
            onChange={setName}
            isRequired
          />
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
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
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

          {register.isError && (
            <p className="text-sm text-negative">{register.error.message}</p>
          )}

          <Button type="submit" isPending={register.isPending} isDisabled={register.isPending}>
            {register.isPending ? "Criando..." : "Criar conta"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Já tem uma conta?{" "}
          <Link to="/login" className="text-brand transition hover:text-brand-dark">
            Entrar
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
