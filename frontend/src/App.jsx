import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/common/ErrorBoundary';
import OverviewDashboard from './pages/OverviewDashboard';
import SegmentExplorer from './pages/SegmentExplorer';
import CustomerExplorer from './pages/CustomerExplorer';
import PredictSegment from './pages/PredictSegment';
import BusinessInsights from './pages/BusinessInsights';
import ModelInsights from './pages/ModelInsights';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<OverviewDashboard />} />
            <Route path="segments" element={<SegmentExplorer />} />
            <Route path="customers" element={<CustomerExplorer />} />
            <Route path="predict" element={<PredictSegment />} />
            <Route path="business-insights" element={<BusinessInsights />} />
            <Route path="model-insights" element={<ModelInsights />} />
            {/* Catch-all redirect to Overview */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
