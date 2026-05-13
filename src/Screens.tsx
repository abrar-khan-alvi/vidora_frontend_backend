import React from 'react';
import { Input, Button, Checkbox, Logo, OTPInput } from './components/ui';

type ScreenProps = {
  setScreen: (screen: string) => void;
  nextScreen?: string;
};

export const LoginScreen = ({ setScreen }: ScreenProps) => (
  <div className="flex flex-col text-center">
    <Logo />
    <h2 className="text-[24px] font-semibold text-white mb-2 tracking-wide">Login to Account</h2>
    <p className="text-[14px] text-[#A1A1A5] mb-8 leading-relaxed">
      Please enter your email and password to continue
    </p>
    <div className="text-left w-full">
      <Input label="Email address" placeholder="Enter your email" />
      <Input label="Password" type="password" placeholder="Enter your password" />
      <div className="flex justify-between items-center mb-7 mt-1">
        <Checkbox label="Remember Password" />
        <button onClick={() => setScreen('FORGOT_PASSWORD')} className="text-[13px] text-[#C4C4C8] hover:text-white transition-colors">
          Forgot Password?
        </button>
      </div>
      <Button onClick={() => setScreen('DASHBOARD')}>Sign in</Button>
      <p className="text-[13.5px] text-[#7A7A80] mt-7 text-center">
        Don't have any account? <button onClick={() => setScreen('CREATE_ACCOUNT')} className="text-white hover:underline underline-offset-[3px] decoration-white/30 transition-all font-medium ml-1">Create an Account</button>
      </p>
    </div>
  </div>
);

export const CreateAccountScreen = ({ setScreen }: ScreenProps) => (
  <div className="flex flex-col text-center">
    <Logo />
    <h2 className="text-[24px] font-semibold text-white mb-2 tracking-wide">Create an Account</h2>
    <p className="text-[14px] text-[#A1A1A5] mb-8 leading-relaxed">
      Create your account to manage admin panel
    </p>
    <div className="text-left w-full">
      <Input label="Email address" placeholder="Enter your email" />
      <Input label="Password" type="password" placeholder="Create a password" />
      <Input label="Confirm Password" type="password" placeholder="Confirm your password" />
      <div className="flex justify-between items-center mb-7 mt-1">
        <Checkbox label="Remember Password" />
      </div>
      <Button onClick={() => setScreen('VERIFY_EMAIL_SIGNUP')}>Sign up</Button>
      <p className="text-[13.5px] text-[#7A7A80] mt-7 text-center">
        Already have an account? <button onClick={() => setScreen('LOGIN')} className="text-white hover:underline underline-offset-[3px] decoration-white/30 transition-all font-medium ml-1">Sign in</button>
      </p>
    </div>
  </div>
);

export const ForgotPasswordScreen = ({ setScreen }: ScreenProps) => (
  <div className="flex flex-col text-center">
    <Logo />
    <h2 className="text-[24px] font-semibold text-white mb-2 tracking-wide">Forget Password?</h2>
    <p className="text-[14px] text-[#A1A1A5] mb-8 leading-relaxed">
      Please enter your email to get verification code
    </p>
    <div className="text-left w-full">
      <Input label="Email address" placeholder="Enter your email" />
      <div className="mt-2 text-center h-[52px]"></div> {/* spacer to maintain similar card height, though auto flow is fine too */}
      <Button onClick={() => setScreen('VERIFY_EMAIL')} className="mt-2">Send Code</Button>
      <div className="mt-7"></div>
    </div>
  </div>
);

export const VerifyEmailScreen = ({ setScreen, nextScreen }: ScreenProps) => (
  <div className="flex flex-col text-center">
    <Logo />
    <h2 className="text-[24px] font-semibold text-white mb-2 tracking-wide">Check your email</h2>
    <p className="text-[14px] text-[#A1A1A5] mb-2 leading-relaxed max-w-[320px] mx-auto">
      We sent a code to your email address. Please check your email for the 5 digit code.
    </p>
    
    <OTPInput />
    
    <Button onClick={() => setScreen(nextScreen || 'SET_PASSWORD')}>Verify</Button>
    <p className="text-[13.5px] text-[#7A7A80] mt-7 text-center">
      You have not received the email? <button className="text-[#A1A1A5] hover:text-white transition-colors underline underline-offset-[3px] decoration-[#A1A1A5]/50 ml-1">Resend</button>
    </p>
  </div>
);

export const SetPasswordScreen = ({ setScreen }: ScreenProps) => (
  <div className="flex flex-col text-center">
    <Logo />
    <h2 className="text-[24px] font-semibold text-white mb-2 tracking-wide">Set a new password</h2>
    <p className="text-[14px] text-[#A1A1A5] mb-8 leading-relaxed max-w-[300px] mx-auto">
      Create a new password. Ensure it differs from previous ones for security
    </p>
    <div className="text-left w-full">
      <Input label="Password" type="password" placeholder="Enter new password" />
      <Input label="Confirm Password" type="password" placeholder="Confirm new password" />
      <Button onClick={() => setScreen('PASSWORD_UPDATED')} className="mt-2">Reset Password</Button>
      <div className="mt-7"></div>
    </div>
  </div>
);

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
      Your account has been created successfully! You can sign in now.
    </p>
    <Button onClick={() => setScreen('LOGIN')}>Sign in</Button>
    <div className="mt-7"></div>
  </div>
);
