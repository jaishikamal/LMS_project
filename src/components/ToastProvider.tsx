"use client";

import { ToastContainer } from "react-toastify";
import "react-toastify/ReactToastify.css";

/**
 * Mounts react-toastify once for the whole dashboard. The container has to
 * live in a client component because the layout itself is a server component.
 */
const ToastProvider = () => (
  <ToastContainer
    position="bottom-right"
    autoClose={3000}
    hideProgressBar={false}
    newestOnTop
    closeOnClick
    pauseOnHover
    draggable
    theme="light"
  />
);

export default ToastProvider;
