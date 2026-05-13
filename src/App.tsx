import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  LoginScreen,
  CreateAccountScreen,
  ForgotPasswordScreen,
  VerifyEmailScreen,
  SetPasswordScreen,
  PasswordUpdatedScreen,
  AccountCreatedScreen
} from './Screens';
import { DashboardScreen } from './Dashboard';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('LOGIN');

  if (currentScreen === 'DASHBOARD') {
    return <DashboardScreen setScreen={setCurrentScreen} />;
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'LOGIN': return <LoginScreen setScreen={setCurrentScreen} />;
      case 'CREATE_ACCOUNT': return <CreateAccountScreen setScreen={setCurrentScreen} />;
      case 'FORGOT_PASSWORD': return <ForgotPasswordScreen setScreen={setCurrentScreen} />;
      case 'VERIFY_EMAIL': return <VerifyEmailScreen setScreen={setCurrentScreen} />;
      case 'VERIFY_EMAIL_SIGNUP': return <VerifyEmailScreen setScreen={setCurrentScreen} nextScreen="ACCOUNT_CREATED" />;
      case 'SET_PASSWORD': return <SetPasswordScreen setScreen={setCurrentScreen} />;
      case 'PASSWORD_UPDATED': return <PasswordUpdatedScreen setScreen={setCurrentScreen} />;
      case 'ACCOUNT_CREATED': return <AccountCreatedScreen setScreen={setCurrentScreen} />;
      default: return <LoginScreen setScreen={setCurrentScreen} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#08080A] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Background Decorative Glows */}
      <div className="absolute top-[0%] left-[0%] w-[45vw] h-[45vw] min-w-[400px] bg-[#673BA5] opacity-20 rounded-full blur-[140px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] min-w-[400px] bg-[#3B82F6] opacity-10 rounded-full blur-[140px] pointer-events-none mix-blend-screen" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-[450px] bg-[#161619] border border-white/[0.04] shadow-2xl rounded-[18px] p-8 sm:p-10 pt-10 sm:pt-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, y: 15, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -15, filter: 'blur(4px)' }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </div>
      
    </div>
  );
}
