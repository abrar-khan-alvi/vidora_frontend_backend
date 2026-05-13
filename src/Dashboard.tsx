import { useState } from 'react';
import { DashboardLayout } from './components/DashboardLayout';
import { OverviewContent } from './pages/Overview';
import { PromptonContent } from './pages/Prompton';
import { ImageGenerationContent } from './pages/ImageGeneration';
import { VideoGenerationContent } from './pages/VideoGeneration';
import { VoiceSyncContent } from './pages/VoiceSync';
import { SubscriptionsContent } from './pages/Subscriptions';
import { HistoryLogsContent } from './pages/HistoryLogs';

export const DashboardScreen = ({ setScreen }: { setScreen: (s: string) => void }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const renderContent = () => {
    switch (activeTab) {
      case 'prompton': return <PromptonContent />;
      case 'image-generation': return <ImageGenerationContent />;
      case 'video-generation': return <VideoGenerationContent />;
      case 'voicesync': return <VoiceSyncContent />;
      case 'subscriptions': return <SubscriptionsContent />;
      case 'history': return <HistoryLogsContent />;
      case 'overview':
      default: return <OverviewContent />;
    }
  };

  return (
    <DashboardLayout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      setScreen={setScreen}
    >
      {renderContent()}
    </DashboardLayout>
  );
};
