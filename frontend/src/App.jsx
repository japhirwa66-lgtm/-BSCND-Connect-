import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/AppLayout.jsx';
import Spinner from './components/Spinner.jsx';

// Route-level code splitting: the public form page ships without the builder/dashboard code.
const Home = lazy(() => import('./pages/Home.jsx'));
const CreateForm = lazy(() => import('./pages/CreateForm.jsx'));
const EditForm = lazy(() => import('./pages/EditForm.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const PublicForm = lazy(() => import('./pages/PublicForm.jsx'));
const PublicResults = lazy(() => import('./pages/PublicResults.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

export default function App() {
  return (
    <Suspense fallback={<Spinner full />}>
      <Routes>
        <Route path="/f/:slug" element={<PublicForm />} />
        <Route path="/f/:slug/results" element={<PublicResults />} />
        <Route element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="create" element={<CreateForm />} />
          <Route path="manage/:key" element={<Dashboard />} />
          <Route path="manage/:key/edit" element={<EditForm />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
