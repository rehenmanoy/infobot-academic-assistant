// Project Smart Obit for Malayala Manorama Co LTD
// Developed By Donis Abraham | Billan Jacob John | Afueth Thomas
// Start Date : 2024-10-07

import {Navigate} from 'react-router-dom';

const isAuthenticated = () => {
    return !!localStorage.getItem('access_token');
};

// eslint-disable-next-line react/prop-types
const ProtectedRoute = ({children}) => {
    if (!isAuthenticated()) {
        return <Navigate to="/"/>;
    }
    return children;
};

export default ProtectedRoute;
