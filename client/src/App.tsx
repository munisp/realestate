import React, { Suspense } from "react";
// @ts-nocheck
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import VideoTour from "@/pages/VideoTour";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ComparisonProvider } from "./contexts/ComparisonContext";
import { ComparisonToolbar } from "./components/ComparisonToolbar";
import Home from "./pages/Home";
import Properties from "./pages/Properties";
import PropertyDetail from "./pages/PropertyDetail";
import Dashboard from "./pages/Dashboard";
import Compare from "./pages/Compare";
import Analytics from "./pages/Analytics";
import Agents from "./pages/Agents";
import AgentDetail from "./pages/AgentDetail";
import Messages from "./pages/Messages";
import SearchAlerts from "./pages/SearchAlerts";
import VirtualTour from "./pages/VirtualTour";
import VirtualTourPage from "./pages/VirtualTourPage";
import VirtualTourManagement from "./pages/VirtualTourManagement";
import VideoTourRoom from "./pages/VideoTourRoom";
import ShortletSearch from "./pages/ShortletSearch";
import ShortletMap from "./pages/ShortletMap";
import SavedMapSearches from "./pages/SavedMapSearches";
import BuilderMarketplace from "./pages/BuilderMarketplace";
import MyProjects from "./pages/MyProjects";
import NeighborhoodIntelligence from "./pages/NeighborhoodIntelligence";
import AIRecommendations from "./pages/AIRecommendations";
import OpenHouseManagement from "./pages/OpenHouseManagement";
import InvestmentCalculator from "./pages/InvestmentCalculator";
import DocumentSigning from "./pages/DocumentSigning";
import AgentPerformance from "./pages/AgentPerformance";
import PropertyAlerts from "./pages/PropertyAlerts";
import Documents from "./pages/Documents";
import BuilderProjects from "./pages/BuilderProjects";
import ShortLets from "./pages/ShortLets";
import BuilderDashboard from "./pages/BuilderDashboard";
import BuilderApplication from "./pages/BuilderApplication";
import AdminBuilderVerification from "./pages/AdminBuilderVerification";
import BuilderProjectDetail from "./pages/BuilderProjectDetail";
import ShortLetDetail from "./pages/ShortLetDetail";
import Checkout from "./pages/Checkout";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailure from "./pages/PaymentFailure";
import BookingsDashboard from "./pages/BookingsDashboard";
import InspectorVerification from "./pages/InspectorVerification";
import MyListings from "./pages/MyListings";
import PropertyForm from "./pages/PropertyForm";
import PropertyAnalytics from "./pages/PropertyAnalytics";
import PricingAnalytics from "./pages/PricingAnalytics";
import CompetitorAnalytics from "./pages/CompetitorAnalytics";
import JobMonitoring from "./pages/admin/JobMonitoring";
import EmailTemplates from "./pages/admin/EmailTemplates";
import CompetitorInsights from "./pages/admin/CompetitorInsights";
import OwnerDashboard from "./pages/OwnerDashboard";
import Favorites from "./pages/Favorites";
import MapSearch from "./pages/MapSearch";
import Alerts from "./pages/Alerts";
import BuyerJourney from "./pages/BuyerJourney";
import AgentLeads from "./pages/AgentLeads";
import NotificationPreferences from "./pages/NotificationPreferences";
import NotificationSettings from "./pages/NotificationSettings";
import TourScheduler from "./pages/TourScheduler";
import MyTours from "./pages/MyTours";
const AdvancedMapSearch = React.lazy(() => import("./pages/AdvancedMapSearch"));
import BuyerDashboardCustomizable from "./pages/BuyerDashboardCustomizable";
const AdminDashboard = React.lazy(() => import("./pages/AdminDashboard"));
import EscrowManagement from "./pages/EscrowManagement";
const AdminAnalytics = React.lazy(() => import("./pages/AdminAnalytics"));
import AdminUsers from "./pages/AdminUsers";
import AuditLog from "./pages/AuditLog";
import RoleManagement from "./pages/RoleManagement";
import PropertySearch from "./pages/PropertySearchEnhanced";
const NeighborhoodAnalytics = React.lazy(() => import("./pages/NeighborhoodAnalytics"));
import MortgagePreApproval from "./pages/MortgagePreApproval";
import OfferManagement from "./pages/OfferManagement";
import OfferComparison from "./pages/OfferComparison";
import EmailDeliveryDashboard from "./pages/EmailDeliveryDashboard";
import EmailTemplateBuilder from "./pages/EmailTemplateBuilder";
import PropertyValuationHistory from "./pages/PropertyValuationHistory";
import PropertyInspectionScheduler from "./pages/PropertyInspectionScheduler";
import PropertyCollections from "./pages/PropertyCollections";
import BuyersChecklist from "./pages/BuyersChecklist";
import FindAgent from "./pages/FindAgent";
import MovingCalculator from "./pages/MovingCalculator";
import PropertyTaxCalculator from "./pages/PropertyTaxCalculator";
import HomeWarranty from "./pages/HomeWarranty";
import ClosingCosts from "./pages/ClosingCosts";
import RentVsBuy from "./pages/RentVsBuy";
import AffordabilityCalculator from "./pages/AffordabilityCalculator";
import RefinanceCalculator from "./pages/RefinanceCalculator";
const InvestmentPropertyCalculator = React.lazy(() => import("./pages/InvestmentPropertyCalculator"));
import HomeEquityCalculator from "./pages/HomeEquityCalculator";
import FirstTimeBuyerGuide from "./pages/FirstTimeBuyerGuide";
import SellerDashboard from "./pages/SellerDashboard";
import DocumentVault from "./pages/DocumentVault";
import OpenHouseScheduler from "./pages/OpenHouseScheduler";
import PropertyPerformanceDashboard from "./pages/PropertyPerformanceDashboard";
import BuyerPreQualification from "./pages/BuyerPreQualification";
import SellerPricingAssistant from "./pages/SellerPricingAssistant";
import BuyerDashboard from "./pages/BuyerDashboard";
import PropertyAnalyticsDashboard from "./pages/PropertyAnalyticsDashboard";
import { LiveChatWidget } from "./components/LiveChatWidget";
import { MobileBottomNav } from "./components/MobileBottomNav";
const AIAssistant = React.lazy(() => import("./pages/AIAssistant"));
import BlockchainRegistry from "./pages/BlockchainRegistry";
import CurrencySettings from "./pages/CurrencySettings";
import VerifiedProperties from "./pages/VerifiedProperties";
import AlertsDashboard from "./pages/AlertsDashboard";
import SmartRecommendations from "./pages/SmartRecommendations";
import FeedbackAnalytics from "./pages/FeedbackAnalytics";
import RecommendationPreferences from "./pages/RecommendationPreferences";
const ABTestingDashboard = React.lazy(() => import("./pages/ABTestingDashboard"));
const MLTrainingDashboard = React.lazy(() => import("./pages/MLTrainingDashboard"));
import OllamaModelManagement from "./pages/OllamaModelManagement";
import LagosNeighborhoodExplorer from "./pages/LagosNeighborhoodExplorer";
import RecommendationsPage from "./pages/RecommendationsPage";
import SavedSearchesPage from "./pages/SavedSearchesPage";
import ShortletHostOnboarding from "./pages/ShortletHostOnboarding";
import BuilderOnboarding from "./pages/BuilderOnboarding";
import MarketTrendsDashboard from "./pages/MarketTrendsDashboard";
import BuyerOnboarding from "./pages/BuyerOnboarding";
import AdminVerificationDashboard from "./pages/AdminVerificationDashboard";
import EmailPreferences from "./pages/EmailPreferences";
import ProfileSettings from "./pages/ProfileSettings";
import MobileAppLanding from "./pages/MobileAppLanding";
import PropertyDetailValuation from "./pages/PropertyDetailValuation";
import ValuationAnalytics from "./pages/ValuationAnalytics";
import AlertManagement from "./pages/AlertManagement";
import AlertHistory from "./pages/AlertHistory";
import PropertyValuationAlerts from "./pages/PropertyValuationAlerts";
import CompareEnhanced from "./pages/CompareEnhanced";
const ARPropertyView = React.lazy(() => import("./pages/ARPropertyView"));
import VirtualStaging from "./pages/VirtualStaging";
import NeighborhoodCompare from "./pages/NeighborhoodCompare";
import MyAppointments from "./pages/MyAppointments";
import MyOffers from "./pages/MyOffers";
import AgentDashboard from "./pages/AgentDashboard";
import OfferAnalytics from "./pages/OfferAnalytics";
import EmailAnalyticsDashboard from "./pages/EmailAnalyticsDashboard";
import ScheduledCampaignsManagement from "./pages/ScheduledCampaignsManagement";
import EmailPreferenceCenter from "./pages/EmailPreferenceCenter";
import EmailAbTesting from "./pages/EmailAbTesting";
import EmailTemplateBuilderAdvanced from "./pages/EmailTemplateBuilderAdvanced";
import ReEngagementCampaigns from "./pages/ReEngagementCampaigns";
import MonitoringDashboard from "./pages/MonitoringDashboard";
import AdminMonitoringOverview from "./pages/AdminMonitoringOverview";
import DataQualityDashboard from "./pages/DataQualityDashboard";
import MarketTrendDashboard from "./pages/MarketTrendDashboard";
import NeighborhoodComparisonGNN from "./pages/NeighborhoodComparisonGNN";
import GnnAlerts from "./pages/GnnAlerts";
import AdvancedSearch from "./pages/AdvancedSearch";
import InvestmentDashboard from "./pages/InvestmentDashboard";
import LandRegistryDashboard from "./pages/LandRegistryDashboard";
import LandRecordDetail from "./pages/LandRecordDetail";
import CofOVerification from "./pages/CofOVerification";
import VerificationHistory from "./pages/VerificationHistory";
import RegistryMonitoring from "./pages/RegistryMonitoring";
import RegistryCredentialsSetup from "./pages/admin/RegistryCredentialsSetup";
import GeospatialVerificationReport from "./pages/GeospatialVerificationReport";
import CofOMLTrainingDashboard from "./pages/admin/CofOMLTrainingDashboard";
import InvestorOnboarding from "./pages/InvestorOnboarding";
import SmartPricingDashboard from "./pages/SmartPricingDashboard";
import MarketIntelligence from "./pages/MarketIntelligence";
import PropertyTrackingSettings from "./pages/PropertyTrackingSettings";
import GNNTest from "./pages/GNNTest";
import BulkVerification from "./pages/BulkVerification";
import BulkVerificationDetail from "./pages/BulkVerificationDetail";
import COFOVerification from "./pages/COFOVerification";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path="/properties" component={Properties} />
      <Route path="/property/:id" component={PropertyDetail} />
      <Route path="/property/:id/valuation" component={PropertyDetailValuation} />
      <Route path="/property/:id/alerts" component={PropertyValuationAlerts} />
      <Route path="/property/:id/ar" component={ARPropertyView} />
      <Route path="/property/:id/staging" component={VirtualStaging} />
      <Route path="/property/:id/tracking" component={PropertyTrackingSettings} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/compare" component={Compare} />
      <Route path="/compare/enhanced" component={CompareEnhanced} />
      <Route path="/neighborhoods/compare" component={NeighborhoodCompare} />
      <Route path="/search/advanced" component={AdvancedSearch} />
      <Route path="/investor-onboarding" component={InvestorOnboarding} />
      <Route path="/investment-dashboard" component={InvestmentDashboard} />
      <Route path="/land-registry" component={LandRegistryDashboard} />
      <Route path="/land-registry/land/:id" component={LandRecordDetail} />
      <Route path="/land-registry/verify" component={CofOVerification} />
      <Route path="/verification-history" component={VerificationHistory} />
      <Route path="/bulk-verification" component={BulkVerification} />
      <Route path="/bulk-verification/:jobId" component={BulkVerificationDetail} />
      <Route path="/cofo-verification" component={COFOVerification} />
      <Route path="/admin/registry-monitoring" component={RegistryMonitoring} />
      <Route path="/admin/registry-credentials" component={RegistryCredentialsSetup} />
      <Route path="/verification/geospatial/:id" component={GeospatialVerificationReport} />
      <Route path="/admin/cofo-ml-training" component={CofOMLTrainingDashboard} />
      <Route path="/pricing/dashboard" component={SmartPricingDashboard} />
      <Route path="/market-intelligence" component={MarketIntelligence} />
      <Route path="/gnn-test" component={GNNTest} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/agents" component={Agents} />
      <Route path="/agent/performance" component={AgentPerformance} />
      <Route path="/agent/dashboard" component={AgentDashboard} />
      <Route path="/agent/leads" component={AgentLeads} />
      <Route path="/agent/:id" component={AgentDetail} />
      <Route path="/messages" component={Messages} />
      <Route path="/search-alerts" component={SearchAlerts} />
      <Route path="/virtual-tour/:propertyId" component={VirtualTour} />
      <Route path="/property/:id/virtual-tour" component={VirtualTourPage} />
      <Route path="/virtual-tours/manage" component={VirtualTourManagement} />
      <Route path="/video-tour/:roomId" component={VideoTourRoom} />
      <Route path="/video-call/:roomName" component={VideoTour} />
      <Route path="/shortlet" component={ShortletSearch} />
      <Route path="/shortlet/map" component={ShortletMap} />
      <Route path="/shortlet/saved-searches" component={SavedMapSearches} />
      <Route path="/builders" component={BuilderMarketplace} />
      <Route path="/my-projects" component={MyProjects} />
      <Route path="/neighborhood-intelligence/:id" component={NeighborhoodIntelligence} />
      <Route path="/recommendations" component={AIRecommendations} />
      <Route path="/open-house" component={OpenHouseManagement} />
      <Route path="/investment-calculator" component={InvestmentCalculator} />
      <Route path="/alerts" component={PropertyAlerts} />
      <Route path="/documents/sign" component={DocumentSigning} />
      <Route path="/documents" component={Documents} />
      <Route path="/builder-projects" component={BuilderProjects} />
      <Route path="/short-lets" component={ShortLets} />
      <Route path="/builder/dashboard" component={BuilderDashboard} />
      <Route path="/builder/apply" component={BuilderApplication} />
      <Route path="/admin/builder-verification" component={AdminBuilderVerification} />
      <Route path="/builder-project/:id" component={BuilderProjectDetail} />
      <Route path="/short-let/:id" component={ShortLetDetail} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/payment-success" component={PaymentSuccess} />
      <Route path="/payment-failure" component={PaymentFailure} />
      <Route path="/my-bookings" component={BookingsDashboard} />
      <Route path="/my-appointments" component={MyAppointments} />
      <Route path="/my-offers" component={MyOffers} />
      <Route path="/offer-analytics" component={OfferAnalytics} />
      <Route path="/inspector/verification" component={InspectorVerification} />
      <Route path="/my-listings" component={MyListings} />
      <Route path="/listings/new" component={PropertyForm} />
      <Route path="/listings/edit/:id" component={PropertyForm} />
      <Route path="/property-analytics" component={PropertyAnalytics} />
      <Route path="/pricing-analytics" component={PricingAnalytics} />
      <Route path="/owner/dashboard" component={OwnerDashboard} />
      <Route path="/favorites" component={Favorites} />
      <Route path="/map" component={MapSearch} />
      <Route path="/search" component={PropertySearch} />
      <Route path="/neighborhood/:h3Index" component={NeighborhoodAnalytics} />
      <Route path="/mortgage/apply" component={MortgagePreApproval} />
      <Route path="/offers" component={OfferManagement} />
      <Route path="/property/:propertyId/offers/compare" component={OfferComparison} />
      <Route path="/admin/email-delivery" component={EmailDeliveryDashboard} />
      <Route path="/admin/email-analytics" component={EmailAnalyticsDashboard} />
      <Route path="/admin/email-campaigns" component={ScheduledCampaignsManagement} />
      <Route path="/admin/email-templates" component={EmailTemplateBuilder} />
      <Route path="/property/:id/valuation-history" component={PropertyValuationHistory} />
      <Route path="/property/:id/schedule-inspection" component={PropertyInspectionScheduler} />
      <Route path="/collections" component={PropertyCollections} />
      <Route path="/buyer-checklist" component={BuyersChecklist} />
      <Route path="/find-agent" component={FindAgent} />
      <Route path="/moving-calculator" component={MovingCalculator} />
      <Route path="/tax-calculator" component={PropertyTaxCalculator} />
      <Route path="/home-warranty" component={HomeWarranty} />
      <Route path="/closing-costs" component={ClosingCosts} />
      <Route path="/rent-vs-buy" component={RentVsBuy} />
      <Route path="/affordability-calculator" component={AffordabilityCalculator} />
      <Route path="/refinance-calculator" component={RefinanceCalculator} />
      <Route path="/investment-calculator" component={InvestmentPropertyCalculator} />
      <Route path="/equity-calculator" component={HomeEquityCalculator} />
      <Route path="/first-time-buyer" component={FirstTimeBuyerGuide} />
      <Route path="/seller-dashboard" component={SellerDashboard} />
      <Route path="/documents" component={DocumentVault} />
      <Route path="/open-house" component={OpenHouseScheduler} />
      <Route path="/property/:id/analytics" component={PropertyPerformanceDashboard} />
      <Route path="/pre-qualify" component={BuyerPreQualification} />
      <Route path="/pricing-assistant" component={SellerPricingAssistant} />
      <Route path="/buyer-dashboard" component={BuyerDashboard} />
      <Route path="/admin/property-analytics" component={PropertyAnalyticsDashboard} />
      <Route path="/alerts" component={Alerts} />
      <Route path="/buyer-journey" component={BuyerJourney} />
       <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/monitoring" component={AdminMonitoringOverview} />
      <Route path="/admin/monitoring/alerts" component={MonitoringDashboard} />
      <Route path="/admin/monitoring/data-quality" component={DataQualityDashboard} />
      <Route path={"/admin/analytics"} component={AdminAnalytics} />
      <Route path="/admin/valuation-analytics" component={ValuationAnalytics} />
      <Route path={"/admin/users"} component={AdminUsers} />
      <Route path={"/admin/audit-log"} component={AuditLog} />
      <Route path={"/admin/roles"} component={RoleManagement} />
      <Route path="/escrow" component={EscrowManagement} />
      <Route path="/settings/notifications" component={NotificationPreferences} />
      <Route path="/notifications" component={NotificationSettings} />
      <Route path="/property/:propertyId/schedule-tour" component={TourScheduler} />
      <Route path="/my-tours" component={MyTours} />
      <Route path="/map/advanced" component={AdvancedMapSearch} />
      <Route path="/buyer-dashboard-custom" component={BuyerDashboardCustomizable} />
      <Route path="/ai-assistant" component={AIAssistant} />
      <Route path="/blockchain-registry" component={BlockchainRegistry} />
      <Route path="/settings/currency" component={CurrencySettings} />
      <Route path="/verified-properties" component={VerifiedProperties} />
      <Route path="/alerts-dashboard" component={AlertsDashboard} />
      <Route path="/smart-recommendations" component={SmartRecommendations} />
      <Route path="/feedback-analytics" component={FeedbackAnalytics} />
      <Route path="/recommendation-preferences" component={RecommendationPreferences} />
      <Route path="/ab-testing" component={ABTestingDashboard} />
      <Route path="/ml-training" component={MLTrainingDashboard} />
      <Route path="/ollama-management" component={OllamaModelManagement} />
      <Route path="/lagos-neighborhoods" component={LagosNeighborhoodExplorer} />
      <Route path="/my-recommendations" component={RecommendationsPage} />
      <Route path="/saved-searches" component={SavedSearchesPage} />
      <Route path="/shortlet-host/onboarding" component={ShortletHostOnboarding} />
      <Route path="/builder/onboarding" component={BuilderOnboarding} />
      <Route path="/market-trends" component={MarketTrendsDashboard} />
      <Route path="/market-trends-gnn" component={MarketTrendDashboard} />
      <Route path="/neighborhoods/compare-gnn" component={NeighborhoodComparisonGNN} />
      <Route path="/gnn-alerts" component={GnnAlerts} />
      <Route path="/buyer/onboarding" component={BuyerOnboarding} />
      <Route path="/admin/verification" component={AdminVerificationDashboard} />
      <Route path="/email-preferences" component={EmailPreferences} />
      <Route path="/settings/email-preferences" component={EmailPreferenceCenter} />
      <Route path="/admin/email-ab-testing" component={EmailAbTesting} />
      <Route path="/admin/email-template-builder" component={EmailTemplateBuilderAdvanced} />
      <Route path="/admin/re-engagement-campaigns" component={ReEngagementCampaigns} />
      <Route path="/admin/competitor-analytics" component={CompetitorAnalytics} />
      <Route path="/admin/job-monitoring" component={JobMonitoring} />
      <Route path="/admin/email-templates" component={EmailTemplates} />
      <Route path="/admin/competitor-insights" component={CompetitorInsights} />
      <Route path="/settings/alerts" component={AlertManagement} />
      <Route path="/settings/alerts/history" component={AlertHistory} />
      <Route path="/profile-settings" component={ProfileSettings} />
      <Route path="/mobile-app" component={MobileAppLanding} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <ComparisonProvider>
          <TooltipProvider>
      <Toaster />
      <Router />
      <LiveChatWidget />
      <MobileBottomNav />
            <ComparisonToolbar />
          </TooltipProvider>
        </ComparisonProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
