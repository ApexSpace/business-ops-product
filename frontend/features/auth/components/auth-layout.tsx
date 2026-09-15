import { AuthLogo } from "@/features/auth/components/auth-logo";
import {
  AUTH_FORM_SLOT_CLASS,
  AUTH_MAIN_CLASS,
  AUTH_SHELL_CLASS,
  AUTH_STACK_CLASS,
} from "@/lib/design/auth-tokens";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={AUTH_SHELL_CLASS}>
      <main className={AUTH_MAIN_CLASS}>
        <div className={AUTH_STACK_CLASS}>
          <AuthLogo />
          <div className={AUTH_FORM_SLOT_CLASS}>{children}</div>
        </div>
      </main>
    </div>
  );
}
