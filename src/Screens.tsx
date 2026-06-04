import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Input, Button, Checkbox, Logo, OTPInput, FormError } from './components/ui';
import { useAuth } from './auth/AuthContext';
import { useAuthFlow } from './auth/AuthFlowContext';
import { authApi } from './lib/api/auth';
import { ApiError } from './lib/api/client';

type ScreenProps = {
  setScreen: (screen: string) => void;
  mode?: 'signup' | 'reset';
};

const errMessage = (e: unknown) =>
  e instanceof ApiError ? e.message : 'Something went wrong. Please try again.';

export const LoginScreen = ({ setScreen }: ScreenProps) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      setScreen('DASHBOARD');
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? 'Incorrect email or password — or your email isn\'t verified yet.'
          : errMessage(err),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col text-center">
      <Logo />
      <h2 className="text-[24px] font-semibold text-white mb-2 tracking-wide">Login to Account</h2>
      <p className="text-[14px] text-[#A1A1A5] mb-8 leading-relaxed">
        Please enter your email and password to continue
      </p>
      <div className="text-left w-full">
        <Input label="Email address" type="email" placeholder="Enter your email" value={email}
          onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        <Input label="Password" type="password" placeholder="Enter your password" value={password}
          onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        <div className="flex justify-between items-center mb-7 mt-1">
          <Checkbox label="Remember Password" />
          <button type="button" onClick={() => setScreen('FORGOT_PASSWORD')} className="text-[13px] text-[#C4C4C8] hover:text-white transition-colors">
            Forgot Password?
          </button>
        </div>
        <FormError message={error} />
        <Button type="submit" loading={loading}>Sign in</Button>
        <p className="text-[13.5px] text-[#7A7A80] mt-7 text-center">
          Don't have any account? <button type="button" onClick={() => setScreen('CREATE_ACCOUNT')} className="text-white hover:underline underline-offset-[3px] decoration-white/30 transition-all font-medium ml-1">Create an Account</button>
        </p>
      </div>
    </form>
  );
};

export const CreateAccountScreen = ({ setScreen }: ScreenProps) => {
  const { setEmail: setFlowEmail } = useAuthFlow();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await authApi.register(email, password);
      setFlowEmail(email);
      setScreen('VERIFY_EMAIL_SIGNUP');
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col text-center">
      <Logo />
      <h2 className="text-[24px] font-semibold text-white mb-2 tracking-wide">Create an Account</h2>
      <p className="text-[14px] text-[#A1A1A5] mb-8 leading-relaxed">
        Create your account to start creating with Vidora
      </p>
      <div className="text-left w-full">
        <Input label="Email address" type="email" placeholder="Enter your email" value={email}
          onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        <Input label="Password" type="password" placeholder="Create a password" value={password}
          onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
        <Input label="Confirm Password" type="password" placeholder="Confirm your password" value={confirm}
          onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
        <div className="flex justify-between items-center mb-7 mt-1">
          <Checkbox label="Remember Password" />
        </div>
        <FormError message={error} />
        <Button type="submit" loading={loading}>Sign up</Button>
        <p className="text-[13.5px] text-[#7A7A80] mt-7 text-center">
          Already have an account? <button type="button" onClick={() => setScreen('LOGIN')} className="text-white hover:underline underline-offset-[3px] decoration-white/30 transition-all font-medium ml-1">Sign in</button>
        </p>
      </div>
    </form>
  );
};

export const ForgotPasswordScreen = ({ setScreen }: ScreenProps) => {
  const { setEmail: setFlowEmail } = useAuthFlow();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setFlowEmail(email);
      setScreen('VERIFY_EMAIL');
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col text-center">
      <Logo />
      <h2 className="text-[24px] font-semibold text-white mb-2 tracking-wide">Forgot Password?</h2>
      <p className="text-[14px] text-[#A1A1A5] mb-8 leading-relaxed">
        Please enter your email to get a verification code
      </p>
      <div className="text-left w-full">
        <Input label="Email address" type="email" placeholder="Enter your email" value={email}
          onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        <FormError message={error} />
        <Button type="submit" loading={loading} className="mt-2">Send Code</Button>
        <p className="text-[13.5px] text-[#7A7A80] mt-7 text-center">
          Remembered it? <button type="button" onClick={() => setScreen('LOGIN')} className="text-white hover:underline underline-offset-[3px] decoration-white/30 transition-all font-medium ml-1">Sign in</button>
        </p>
      </div>
    </form>
  );
};

export const VerifyEmailScreen = ({ setScreen, mode = 'reset' }: ScreenProps) => {
  const { email, setResetToken } = useAuthFlow();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // If the user lands here without going through the prior step, send them back.
  useEffect(() => {
    if (!email) setScreen(mode === 'signup' ? 'CREATE_ACCOUNT' : 'FORGOT_PASSWORD');
  }, [email, mode, setScreen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (code.length < 5) {
      setError('Please enter the 5-digit code.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signup') {
        await authApi.verifyEmail(email, code);
        setScreen('ACCOUNT_CREATED');
      } else {
        const { reset_token } = await authApi.verifyResetCode(email, code);
        setResetToken(reset_token);
        setScreen('SET_PASSWORD');
      }
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || resending) return;
    setError('');
    setInfo('');
    setResending(true);
    try {
      if (mode === 'reset') {
        await authApi.forgotPassword(email);
        setInfo('A new code has been sent to your email.');
      } else {
        setInfo('Still waiting? Check your spam folder.');
      }
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col text-center">
      <Logo />
      <h2 className="text-[24px] font-semibold text-white mb-2 tracking-wide">Check your email</h2>
      <p className="text-[14px] text-[#A1A1A5] mb-2 leading-relaxed max-w-[320px] mx-auto">
        We sent a 5-digit code to{' '}
        <span className="text-[#C4C4C8] font-medium">{email || 'your email address'}</span>.
      </p>

      <OTPInput value={code} onChange={setCode} length={5} />

      <FormError message={error} />
      {info && <div className="mb-4 -mt-1 text-[13px] text-[#34D399]">{info}</div>}

      <Button type="submit" loading={loading}>Verify</Button>
      <p className="text-[13.5px] text-[#7A7A80] mt-7 text-center">
        You have not received the email?{' '}
        <button type="button" onClick={handleResend} disabled={resending} className="text-[#A1A1A5] hover:text-white transition-colors underline underline-offset-[3px] decoration-[#A1A1A5]/50 ml-1 disabled:opacity-50">
          {resending ? 'Sending…' : 'Resend'}
        </button>
      </p>
    </form>
  );
};

export const SetPasswordScreen = ({ setScreen }: ScreenProps) => {
  const { resetToken, reset: resetFlow } = useAuthFlow();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!resetToken) setScreen('FORGOT_PASSWORD');
  }, [resetToken, setScreen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(resetToken, password);
      resetFlow();
      setScreen('PASSWORD_UPDATED');
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col text-center">
      <Logo />
      <h2 className="text-[24px] font-semibold text-white mb-2 tracking-wide">Set a new password</h2>
      <p className="text-[14px] text-[#A1A1A5] mb-8 leading-relaxed max-w-[300px] mx-auto">
        Create a new password. Ensure it differs from previous ones for security
      </p>
      <div className="text-left w-full">
        <Input label="Password" type="password" placeholder="Enter new password" value={password}
          onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
        <Input label="Confirm Password" type="password" placeholder="Confirm new password" value={confirm}
          onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
        <FormError message={error} />
        <Button type="submit" loading={loading} className="mt-2">Reset Password</Button>
      </div>
    </form>
  );
};

export const PasswordUpdatedScreen = ({ setScreen }: ScreenProps) => (
  <div className="flex flex-col text-center">
    <Logo />
    <h2 className="text-[24px] font-semibold text-white mb-3 tracking-wide">Password Updated<br/>Successfully!</h2>
    <p className="text-[14px] text-[#A1A1A5] mb-8 leading-relaxed max-w-[280px] mx-auto">
      Your new password has been saved. You can now continue securely.
    </p>
    <Button onClick={() => setScreen('LOGIN')}>Sign in</Button>
    <div className="mt-7"></div>
  </div>
);

export const AccountCreatedScreen = ({ setScreen }: ScreenProps) => (
  <div className="flex flex-col text-center mt-2">
    <Logo />
    <h2 className="text-[24px] font-semibold text-white mb-3 tracking-wide">Account Created<br/>Successfully!</h2>
    <p className="text-[14px] text-[#A1A1A5] mb-8 leading-relaxed max-w-[280px] mx-auto">
      Your account has been verified successfully! You can sign in now.
    </p>
    <Button onClick={() => setScreen('LOGIN')}>Sign in</Button>
    <div className="mt-7"></div>
  </div>
);
