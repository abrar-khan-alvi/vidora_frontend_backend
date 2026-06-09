import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from './components/DashboardLayout';
import { CreationFlowProvider } from './lib/creationFlow';
import { OverviewContent } from './pages/Overview';
import { PromptonContent } from './pages/Prompton';
import { ImageGenerationContent } from './pages/ImageGeneration';
import { VideoGenerationContent } from './pages/VideoGeneration';
import { EditorContent } from './pages/Editor';
import { VoiceSyncContent } from './pages/VoiceSync';
import { SubscriptionsContent } from './pages/Subscriptions';
import { HistoryLogsContent } from './pages/HistoryLogs';
import { AccountSettingsContent } from './pages/AccountSettings';
import { ReferencesContent } from './pages/References';

export const DashboardScreen = () => {
  const navigate = useNavigate();
  // The parent route is "/dashboard/*", so the tab lives in the splat param.
  const { '*': splat } = useParams();
  // The assistant is the entry point — it conducts the whole creation flow.
  const activeTab = splat || 'prompton';
  const setActiveTab = (tab: string) => navigate(`/dashboard/${tab}`);

  const renderContent = () => {
    switch (activeTab) {
      case 'prompton': return <PromptonContent />;
      case 'image-generation': return <ImageGenerationContent />;
      case 'references': return <ReferencesContent />;
      case 'video-generation': return <VideoGenerationContent />;
      case 'editor': return <EditorContent />;
      case 'voicesync': return <VoiceSyncContent />;
      case 'subscriptions': return <SubscriptionsContent />;
      case 'history': return <HistoryLogsContent />;
      case 'settings': return <AccountSettingsContent />;
      case 'overview':
      default: return <OverviewContent />;
    }
  };

  return (
    <CreationFlowProvider>
      <DashboardLayout
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      >
        {renderContent()}
      </DashboardLayout>
    </CreationFlowProvider>
  );
};
