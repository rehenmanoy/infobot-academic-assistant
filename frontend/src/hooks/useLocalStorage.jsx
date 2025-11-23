// Project Smart Obit for Malayala Manorama Co LTD
// Developed By Donis Abraham | Billan Jacob John | Afueth Thomas
// Start Date : 2024-10-07

export function useLocalStorage() {
    // Custom Hook for managing localStorage values

    const setToken = (token) => {
        localStorage.setItem('access_token', token);
    };

    // const setUser = (username) => {
    //     localStorage.setItem('user', username);
    // };
    //
    // const setFirstName = (firstname) => {
    //     localStorage.setItem('firstname', firstname);
    // };
    //
    // const setSecondName = (secondname) => {
    //     localStorage.setItem('secondname', secondname);
    // };
    //
    // const setUnit = (unit) => {
    //     localStorage.setItem('unit', unit);
    // };
    //
    // const setBureau = (bureau) => {
    //     localStorage.setItem('bureau', bureau);
    // };
    //
    // const setStoriesID = (id) => {
    //     localStorage.setItem('story_id', id);
    // };
    //
    // const setRole = (role) => {
    //     localStorage.setItem('role', role);
    // }
    //
    // const fetchToken = () => {
    //     return localStorage.getItem('dakToken');
    // };
    //
    // const fetchUser = () => {
    //     return localStorage.getItem('username');
    // };
    //
    // const fetchFirstName = () => {
    //     return localStorage.getItem('firstname');
    // };
    //
    // const fetchSecondName = () => {
    //     return localStorage.getItem('secondname');
    // };
    //
    // const fetchUnit = () => {
    //     return localStorage.getItem('unit');
    // };
    //
    // const fetchBureau = () => {
    //     return localStorage.getItem('bureau');
    // };
    //
    // const fetchStoryId = () => {
    //     return localStorage.getItem('story_id');
    // };
    //
    // const fetchRole = () => {
    //     return localStorage.getItem('role');
    // }

    return {
        setToken,
        // setUser,
        // setFirstName,
        // setSecondName,
        // setUnit,
        // setBureau,
        // setStoriesID,
        // setRole,
        // fetchToken,
        // fetchUser,
        // fetchFirstName,
        // fetchSecondName,
        // fetchUnit,
        // fetchBureau,
        // fetchStoryId,
        // fetchRole,
    };
}
