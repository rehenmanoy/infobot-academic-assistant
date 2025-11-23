/*
 Created on 03-02-2025
 Project: frontend
 Author: Donis Abraham
*/
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    isCollapsed: false, // No longer using localStorage
};

const sidebarSlice = createSlice({
    name: "sidebar",
    initialState,
    reducers: {
        toggleSidebar: (state) => {
            state.isCollapsed = !state.isCollapsed;
        },
        setSidebarState: (state, action) => {
            state.isCollapsed = action.payload;
        }
    },
});

export const { toggleSidebar, setSidebarState } = sidebarSlice.actions;
export default sidebarSlice.reducer;
