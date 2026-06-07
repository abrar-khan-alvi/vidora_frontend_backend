import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from './components/DashboardLayout';
import { OverviewContent } from './pages/Overview';
import { PromptonContent } from './pages/Prompton';
import { ImageGenerationContent } from './pages/ImageGeneration';
import { VideoGenerationContent } from './pages/VideoGeneration';
import { VoiceSyncContent } from './pages/VoiceSync';
import { SubscriptionsContent } from './pages/Subscriptions';
import { HistoryLogsContent } from './pages/HistoryLogs';
import { AccountSettingsContent } from './pages/AccountSettings';
import { ReferencesContent } from './pages/References';

export const DashboardScreen = () => {
  const navigate = useNavigate();
  // The parent route is "/dashboard/*", so the tab lives in the splat param.
  const { '*': splat } = useParams();
  const activeTab = splat || 'overview';
  const setActiveTab = (tab: string) => navigate(`/dashboard/${tab}`);

  const renderContent = () => {
    switch (activeTab) {
      case 'prompton': return <PromptonContent />;
      case 'image-generation': return <ImageGenerationContent />;
      case 'references': return <ReferencesContent />;
      case 'video-generation': return <VideoGenerationContent />;
      case 'voicesync': return <VoiceSyncContent />;
      case 'subscriptions': return <SubscriptionsContent />;
      case 'history': return <HistoryLogsContent />;
      case 'settings': return <AccountSettingsContent />;
      case 'overview':
      default: return <OverviewContent />;
    }
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    >
      {renderContent()}
    </DashboardLayout>
  );
};
