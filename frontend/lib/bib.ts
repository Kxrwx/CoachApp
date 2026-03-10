import {v4 as uuidv4} from "uuid"

export const getOrGenerateDeviceId = () => {
  if (typeof window === "undefined") return "server";

  let deviceId = localStorage.getItem('device_id');
  
  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem('device_id', deviceId);
  }
  
  return deviceId;
};