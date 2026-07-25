const { ipcMain } = require("electron");
const userRepo = require("../repositories/userRepo");

function registerAuthHandlers() {
  ipcMain.handle("auth:getUsersCount", async () => {
    try {
      const count = await userRepo.getUsersCount();
      return { success: true, data: count };
    } catch (error) {
      console.error("Error getting users count:", error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("auth:login", async (event, username, password) => {
    try {
      const user = await userRepo.verifyUser(username, password);
      if (user) {
        return { success: true, data: user };
      } else {
        return { success: false, message: "Invalid username or password" };
      }
    } catch (error) {
      console.error("Error during login:", error);
      return { success: false, message: "Login failed" };
    }
  });

  ipcMain.handle("auth:createUser", async (event, username, password, role) => {
    try {
      const newUser = await userRepo.createUser(username, password, "user");
      return { success: true, data: newUser };
    } catch (error) {
      console.error("Error creating user:", error);
      return { success: false, message: error.message || "Could not create user. Username might already exist." };
    }
  });

  ipcMain.handle("auth:getAllUsers", async () => {
    try {
      const users = await userRepo.getAllUsers();
      return { success: true, data: users };
    } catch (error) {
      console.error("Error fetching users:", error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("auth:deleteUser", async (event, id) => {
    try {
      const result = await userRepo.deleteUser(id);
      return { success: true, data: result };
    } catch (error) {
      console.error("Error deleting user:", error);
      return { success: false, message: error.message };
    }
  });

  // ─── RECOVERY ────────────────────────────────────────────────────────────

  ipcMain.handle("auth:generateRecoveryKey", async () => {
    try {
      const key = await userRepo.generateRecoveryKey();
      return { success: true, data: key };
    } catch (error) {
      console.error("Error generating recovery key:", error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("auth:verifyRecoveryKey", async (event, key) => {
    try {
      const isValid = await userRepo.verifyRecoveryKey(key);
      return { success: true, data: isValid };
    } catch (error) {
      console.error("Error verifying recovery key:", error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("auth:resetUserPassword", async (event, username, newPassword) => {
    try {
      const result = await userRepo.resetUserPassword(username, newPassword);
      return { success: true, data: result };
    } catch (error) {
      console.error("Error resetting user password:", error);
      return { success: false, message: error.message };
    }
  });
}

module.exports = { registerAuthHandlers };
