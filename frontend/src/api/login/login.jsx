/*
 Created on 23-01-2025
 Project: frontend
 Author: Donis Abraham
*/

import axios from 'axios';
import {API_BASE_URL} from "../../configs/config.jsx";

const login = async (username, password) => {
    const api = API_BASE_URL + "/api/user_login"
    const response = await axios.post(api, {
        username: username,
        password: password
    });
    return response.data
}
export default login