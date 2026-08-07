import express from "express";

import authMiddleware from "../../middlewares/auth.middleware.js";
import roleMiddleware from "../../middlewares/role.middleware.js";

import {
  handleUserAvatarUpload,
  uploadUserAvatar,
} from "../../utils/multer.js";

import {
  assignUserRoleController,
  deleteUserController,
  getAllUsersController,
  getUserByIdController,
  removeUserAvatarController,
  removeUserRoleController,
  updateUserController,
  updateUserStatusController,
  uploadUserAvatarController,
} from "./user.controller.js";

const router = express.Router();

/* =========================================================
   AUTHENTICATION

   Tamam User routes login ke baghair accessible nahi hongi.
   ========================================================= */

router.use(authMiddleware);

/* =========================================================
   GET ALL REGISTERED USERS

   Admin / Super Admin only.

   GET /api/v1/users

   Optional filters:

   ?search=
   ?role=
   ?status=
   ?isVerified=
   ========================================================= */

router.get(
  "/",

  roleMiddleware(
    "admin",
    "super_admin"
  ),

  getAllUsersController
);

/* =========================================================
   UPDATE USER AVATAR

   Own account:
   Any authenticated dashboard user.

   Other account:
   Admin / Super Admin only.

   Request:

   multipart/form-data

   Field name:

   avatar

   Allowed:

   JPG
   JPEG
   PNG
   WEBP

   Maximum size:

   5 MB

   PATCH /api/v1/users/:id/avatar
   ========================================================= */

router.patch(
  "/:id/avatar",

  handleUserAvatarUpload(
    uploadUserAvatar
  ),

  uploadUserAvatarController
);

/* =========================================================
   REMOVE USER AVATAR

   Own account:
   Any authenticated dashboard user.

   Other account:
   Admin / Super Admin only.

   DELETE /api/v1/users/:id/avatar
   ========================================================= */

router.delete(
  "/:id/avatar",

  removeUserAvatarController
);

/* =========================================================
   ASSIGN ROLE

   Admin / Super Admin only.

   Accepted bodies:

   {
     "roleId": "ROLE_MONGODB_ID"
   }

   ya:

   {
     "roleSlug": "electrical_engineer"
   }

   PATCH /api/v1/users/:id/role
   ========================================================= */

router.patch(
  "/:id/role",

  roleMiddleware(
    "admin",
    "super_admin"
  ),

  assignUserRoleController
);

/* =========================================================
   REMOVE ASSIGNED ROLE

   User wapas default role par chala jayega:

   role: user

   Admin / Super Admin only.

   DELETE /api/v1/users/:id/role
   ========================================================= */

router.delete(
  "/:id/role",

  roleMiddleware(
    "admin",
    "super_admin"
  ),

  removeUserRoleController
);

/* =========================================================
   UPDATE USER STATUS

   Supported values:

   active
   inactive
   blocked

   Admin / Super Admin only.

   PATCH /api/v1/users/:id/status
   ========================================================= */

router.patch(
  "/:id/status",

  roleMiddleware(
    "admin",
    "super_admin"
  ),

  updateUserStatusController
);

/* =========================================================
   GET USER BY ID

   Own account ya Admin / Super Admin.

   GET /api/v1/users/:id
   ========================================================= */

router.get(
  "/:id",

  getUserByIdController
);

/* =========================================================
   UPDATE USER PROFILE

   Own account ya Admin / Super Admin.

   Role, status aur avatar is endpoint se update nahi honge.

   PATCH /api/v1/users/:id
   ========================================================= */

router.patch(
  "/:id",

  updateUserController
);

/* =========================================================
   DELETE USER

   Admin / Super Admin only.

   DELETE /api/v1/users/:id
   ========================================================= */

router.delete(
  "/:id",

  roleMiddleware(
    "admin",
    "super_admin"
  ),

  deleteUserController
);

export default router;