/*
 Created on 03-02-2025
 Project: frontend
 Author: Donis Abraham
*/
import axios from 'axios';
import {API_BASE_URL} from "../../configs/config.jsx";

const get_user_theme_preference = async () => {
    const api = API_BASE_URL + "/api/get_user_preference";
    const response = await axios.post(api, {
        access_token: localStorage.getItem("access_token"),
    });
    return response.data
}
export default get_user_theme_preference