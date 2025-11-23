
import axios from 'axios';
import {API_BASE_URL} from "../../configs/config.jsx";

const user_theme_preference = async (theme, color) => {
    const api = API_BASE_URL + "/api/setup_user_preference";
    const response = await axios.post(api, {
        access_token: localStorage.getItem("access_token"),
        theme: theme,
        color: color
    });
    return response.data
}
export default user_theme_preference