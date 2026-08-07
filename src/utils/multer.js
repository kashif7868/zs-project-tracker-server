import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import multer from "multer";

/* =========================================================
   DIRECTORY PATHS
   ========================================================= */

const currentFilePath =
  fileURLToPath(import.meta.url);

const currentDirectory =
  path.dirname(currentFilePath);

/*
  Current file:

  src/utils/multer.js

  Project root:

  backend/
*/

const projectRoot = path.resolve(
  currentDirectory,
  "../.."
);

const publicDirectory = path.join(
  projectRoot,
  "public"
);

/* =========================================================
   RISK EVIDENCE DIRECTORIES
   ========================================================= */

const riskUploadDirectory = path.join(
  publicDirectory,
  "uploads",
  "risks"
);

const beforeUploadDirectory = path.join(
  riskUploadDirectory,
  "before"
);

const afterUploadDirectory = path.join(
  riskUploadDirectory,
  "after"
);

/* =========================================================
   USER AVATAR DIRECTORIES
   ========================================================= */

const userUploadDirectory = path.join(
  publicDirectory,
  "uploads",
  "users"
);

const avatarUploadDirectory = path.join(
  userUploadDirectory,
  "avatars"
);

/* =========================================================
   UPLOAD LIMITS
   ========================================================= */

/*
  Evidence:

  - Maximum 10 images per request
  - Maximum 10 MB per image
*/

export const MAX_EVIDENCE_IMAGES = 10;

export const MAX_EVIDENCE_IMAGE_SIZE =
  10 * 1024 * 1024;

/*
  User avatar:

  - Maximum 1 image per request
  - Maximum 5 MB
*/

export const MAX_AVATAR_IMAGES = 1;

export const MAX_AVATAR_IMAGE_SIZE =
  5 * 1024 * 1024;

/* =========================================================
   ALLOWED IMAGE TYPES

   JPG
   JPEG
   PNG
   WEBP
   ========================================================= */

const IMAGE_MIME_EXTENSION_MAP = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const ALLOWED_IMAGE_MIME_TYPES =
  new Set(
    Object.keys(
      IMAGE_MIME_EXTENSION_MAP
    )
  );

/* =========================================================
   CREATE UPLOAD DIRECTORIES

   Automatically creates:

   public/
   └── uploads/
       ├── risks/
       │   ├── before/
       │   └── after/
       └── users/
           └── avatars/
   ========================================================= */

const createUploadDirectories =
  () => {
    const directories = [
      publicDirectory,

      riskUploadDirectory,
      beforeUploadDirectory,
      afterUploadDirectory,

      userUploadDirectory,
      avatarUploadDirectory,
    ];

    directories.forEach(
      (directory) => {
        if (
          !fs.existsSync(
            directory
          )
        ) {
          fs.mkdirSync(
            directory,
            {
              recursive: true,
            }
          );
        }
      }
    );
  };

createUploadDirectories();

/* =========================================================
   IMAGE FILE FILTER
   ========================================================= */

const imageFileFilter = (
  _req,
  file,
  callback
) => {
  if (
    !ALLOWED_IMAGE_MIME_TYPES.has(
      file.mimetype
    )
  ) {
    const error = new Error(
      "Only JPG, JPEG, PNG and WEBP images are allowed."
    );

    error.statusCode = 400;
    error.status = 400;

    return callback(
      error,
      false
    );
  }

  return callback(
    null,
    true
  );
};

/* =========================================================
   SAFE VALUE
   ========================================================= */

const createSafeFileValue = (
  value,
  fallback
) => {
  if (
    typeof value !== "string"
  ) {
    return fallback;
  }

  const safeValue =
    value.replace(
      /[^a-zA-Z0-9_-]/g,
      ""
    );

  return (
    safeValue ||
    fallback
  );
};

/* =========================================================
   UNIQUE FILE ID
   ========================================================= */

const createUniqueId = () => {
  return crypto
    .randomUUID()
    .replaceAll("-", "");
};

/* =========================================================
   EVIDENCE IMAGE FILE NAME

   Examples:

   before-RISK_ID-1720000000000-UUID.jpg
   after-RISK_ID-1720000000000-UUID.webp
   ========================================================= */

const createEvidenceFileName = (
  req,
  file,
  evidenceType
) => {
  const extension =
    IMAGE_MIME_EXTENSION_MAP[
      file.mimetype
    ];

  const riskId =
    createSafeFileValue(
      req.params?.riskId,
      "risk"
    );

  return (
    [
      evidenceType,
      riskId,
      Date.now(),
      createUniqueId(),
    ].join("-") +
    extension
  );
};

/* =========================================================
   AVATAR IMAGE FILE NAME

   Example:

   avatar-USER_ID-1720000000000-UUID.webp
   ========================================================= */

const createAvatarFileName = (
  req,
  file
) => {
  const extension =
    IMAGE_MIME_EXTENSION_MAP[
      file.mimetype
    ];

  const userId =
    createSafeFileValue(
      String(
        req.user?._id ||
          req.user?.id ||
          req.params?.id ||
          req.params?.userId ||
          "user"
      ),
      "user"
    );

  return (
    [
      "avatar",
      userId,
      Date.now(),
      createUniqueId(),
    ].join("-") +
    extension
  );
};

/* =========================================================
   EVIDENCE STORAGE FACTORY
   ========================================================= */

const createEvidenceStorage = (
  evidenceType
) => {
  const destination =
    evidenceType === "before"
      ? beforeUploadDirectory
      : afterUploadDirectory;

  return multer.diskStorage({
    destination(
      _req,
      _file,
      callback
    ) {
      callback(
        null,
        destination
      );
    },

    filename(
      req,
      file,
      callback
    ) {
      const filename =
        createEvidenceFileName(
          req,
          file,
          evidenceType
        );

      callback(
        null,
        filename
      );
    },
  });
};

/* =========================================================
   USER AVATAR STORAGE
   ========================================================= */

const avatarStorage =
  multer.diskStorage({
    destination(
      _req,
      _file,
      callback
    ) {
      callback(
        null,
        avatarUploadDirectory
      );
    },

    filename(
      req,
      file,
      callback
    ) {
      const filename =
        createAvatarFileName(
          req,
          file
        );

      callback(
        null,
        filename
      );
    },
  });

/* =========================================================
   BEFORE EVIDENCE MULTER
   ========================================================= */

const beforeEvidenceMulter =
  multer({
    storage:
      createEvidenceStorage(
        "before"
      ),

    fileFilter:
      imageFileFilter,

    limits: {
      fileSize:
        MAX_EVIDENCE_IMAGE_SIZE,

      files:
        MAX_EVIDENCE_IMAGES,
    },
  });

/* =========================================================
   AFTER EVIDENCE MULTER
   ========================================================= */

const afterEvidenceMulter =
  multer({
    storage:
      createEvidenceStorage(
        "after"
      ),

    fileFilter:
      imageFileFilter,

    limits: {
      fileSize:
        MAX_EVIDENCE_IMAGE_SIZE,

      files:
        MAX_EVIDENCE_IMAGES,
    },
  });

/* =========================================================
   USER AVATAR MULTER
   ========================================================= */

const userAvatarMulter =
  multer({
    storage:
      avatarStorage,

    fileFilter:
      imageFileFilter,

    limits: {
      fileSize:
        MAX_AVATAR_IMAGE_SIZE,

      files:
        MAX_AVATAR_IMAGES,
    },
  });

/* =========================================================
   EVIDENCE UPLOAD MIDDLEWARE

   multipart/form-data field:

   images
   ========================================================= */

export const uploadBeforeEvidence =
  beforeEvidenceMulter.array(
    "images",
    MAX_EVIDENCE_IMAGES
  );

export const uploadAfterEvidence =
  afterEvidenceMulter.array(
    "images",
    MAX_EVIDENCE_IMAGES
  );

/* =========================================================
   AVATAR UPLOAD MIDDLEWARE

   multipart/form-data field:

   avatar
   ========================================================= */

export const uploadUserAvatar =
  userAvatarMulter.single(
    "avatar"
  );

/* =========================================================
   REQUEST FILE HELPER
   ========================================================= */

const getRequestFiles = (
  req
) => {
  if (
    Array.isArray(
      req.files
    )
  ) {
    return req.files;
  }

  if (req.file) {
    return [
      req.file,
    ];
  }

  if (
    req.files &&
    typeof req.files ===
      "object"
  ) {
    return Object.values(
      req.files
    ).flat();
  }

  return [];
};

/* =========================================================
   CLEAN FAILED UPLOADS

   Multer upload fail hone par partially uploaded files
   automatically delete hongi.
   ========================================================= */

const cleanupFailedUpload =
  async (
    req
  ) => {
    const files =
      getRequestFiles(req);

    await Promise.allSettled(
      files.map(
        async (
          file
        ) => {
          if (
            !file ||
            typeof file.path !==
              "string"
          ) {
            return;
          }

          try {
            await fs.promises.unlink(
              file.path
            );
          } catch (error) {
            if (
              error?.code !==
              "ENOENT"
            ) {
              console.error(
                "Failed image cleanup:",
                error
              );
            }
          }
        }
      )
    );
  };

/* =========================================================
   GENERIC UPLOAD ERROR HANDLER
   ========================================================= */

const createUploadHandler = ({
  uploadMiddleware,

  fileSizeMessage,
  fileCountMessage,

  unexpectedFieldMessage,
  fallbackMessage,
}) => {
  return (
    req,
    res,
    next
  ) => {
    uploadMiddleware(
      req,
      res,
      async (
        error
      ) => {
        if (!error) {
          return next();
        }

        await cleanupFailedUpload(
          req
        );

        if (
          error instanceof
          multer.MulterError
        ) {
          if (
            error.code ===
            "LIMIT_FILE_SIZE"
          ) {
            return res
              .status(400)
              .json({
                success: false,
                message:
                  fileSizeMessage,
              });
          }

          if (
            error.code ===
              "LIMIT_FILE_COUNT" ||
            error.code ===
              "LIMIT_UNEXPECTED_FILE"
          ) {
            const message =
              error.code ===
              "LIMIT_FILE_COUNT"
                ? fileCountMessage
                : unexpectedFieldMessage;

            return res
              .status(400)
              .json({
                success: false,
                message,
              });
          }

          return res
            .status(400)
            .json({
              success: false,

              message:
                error.message ||
                fallbackMessage,
            });
        }

        if (
          error?.statusCode ===
          400
        ) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                error.message,
            });
        }

        return next(error);
      }
    );
  };
};

/* =========================================================
   EVIDENCE UPLOAD ERROR HANDLER

   Existing route usage remains valid:

   handleEvidenceUpload(
     uploadBeforeEvidence
   )
   ========================================================= */

export const handleEvidenceUpload = (
  uploadMiddleware
) => {
  return createUploadHandler({
    uploadMiddleware,

    fileSizeMessage:
      "Each evidence image must be 10 MB or smaller.",

    fileCountMessage:
      "Maximum 10 evidence images can be uploaded at one time.",

    unexpectedFieldMessage:
      'Evidence images must be uploaded using the field name "images".',

    fallbackMessage:
      "Evidence image upload failed.",
  });
};

/* =========================================================
   USER AVATAR ERROR HANDLER

   Route usage:

   handleUserAvatarUpload(
     uploadUserAvatar
   )
   ========================================================= */

export const handleUserAvatarUpload = (
  uploadMiddleware =
    uploadUserAvatar
) => {
  return createUploadHandler({
    uploadMiddleware,

    fileSizeMessage:
      "Profile picture must be 5 MB or smaller.",

    fileCountMessage:
      "Only one profile picture can be uploaded at a time.",

    unexpectedFieldMessage:
      'Profile picture must be uploaded using the field name "avatar".',

    fallbackMessage:
      "Profile picture upload failed.",
  });
};

/* =========================================================
   GET PUBLIC IMAGE PATHS

   Physical path:

   D:/backend/public/uploads/users/avatars/avatar.jpg

   Database path:

   /uploads/users/avatars/avatar.jpg
   ========================================================= */

export const getUploadedImagePaths = (
  req
) => {
  const files =
    getRequestFiles(req);

  return [
    ...new Set(
      files
        .map(
          (
            file
          ) => {
            if (
              !file ||
              typeof file.path !==
                "string"
            ) {
              return "";
            }

            const absoluteFilePath =
              path.resolve(
                file.path
              );

            const relativeFilePath =
              path.relative(
                publicDirectory,
                absoluteFilePath
              );

            const isOutsidePublic =
              relativeFilePath.startsWith(
                ".."
              ) ||
              path.isAbsolute(
                relativeFilePath
              );

            if (
              isOutsidePublic
            ) {
              return "";
            }

            return `/${relativeFilePath.replaceAll(
              "\\",
              "/"
            )}`;
          }
        )
        .filter(Boolean)
    ),
  ];
};

/* =========================================================
   GET SINGLE AVATAR PATH
   ========================================================= */

export const getUploadedAvatarPath = (
  req
) => {
  const imagePaths =
    getUploadedImagePaths(
      req
    );

  return (
    imagePaths[0] ||
    ""
  );
};

/* =========================================================
   DELETE FILE INSIDE ALLOWED DIRECTORY
   ========================================================= */

const deleteFileInsideDirectory =
  async (
    imagePath,
    allowedDirectory,
    errorLabel
  ) => {
    if (
      typeof imagePath !==
        "string" ||
      !imagePath.trim()
    ) {
      return false;
    }

    /*
      External URL backend se delete nahi hogi.
    */

    if (
      imagePath.startsWith(
        "http://"
      ) ||
      imagePath.startsWith(
        "https://"
      )
    ) {
      return false;
    }

    const cleanImagePath =
      imagePath
        .trim()
        .replaceAll(
          "\\",
          "/"
        )
        .replace(
          /^\/+/,
          ""
        );

    const absoluteImagePath =
      path.resolve(
        publicDirectory,
        cleanImagePath
      );

    const relativePath =
      path.relative(
        allowedDirectory,
        absoluteImagePath
      );

    const isOutsideDirectory =
      relativePath.startsWith(
        ".."
      ) ||
      path.isAbsolute(
        relativePath
      );

    if (
      isOutsideDirectory
    ) {
      return false;
    }

    try {
      await fs.promises.unlink(
        absoluteImagePath
      );

      return true;
    } catch (error) {
      if (
        error?.code ===
        "ENOENT"
      ) {
        return false;
      }

      console.error(
        `${errorLabel} deletion failed:`,
        error
      );

      return false;
    }
  };

/* =========================================================
   DELETE ONE RISK EVIDENCE IMAGE

   Existing Evidence services ke liye.
   ========================================================= */

export const deleteUploadedImage =
  async (
    imagePath
  ) => {
    return deleteFileInsideDirectory(
      imagePath,
      riskUploadDirectory,
      "Evidence image"
    );
  };

/* =========================================================
   DELETE USER AVATAR
   ========================================================= */

export const deleteUploadedAvatar =
  async (
    avatarPath
  ) => {
    return deleteFileInsideDirectory(
      avatarPath,
      avatarUploadDirectory,
      "User avatar"
    );
  };

/* =========================================================
   DELETE MULTIPLE EVIDENCE IMAGES
   ========================================================= */

export const deleteUploadedImages =
  async (
    imagePaths = []
  ) => {
    if (
      !Array.isArray(
        imagePaths
      )
    ) {
      return {
        requested: 0,
        deleted: 0,
      };
    }

    const uniqueImagePaths = [
      ...new Set(
        imagePaths.filter(
          (
            imagePath
          ) =>
            typeof imagePath ===
              "string" &&
            imagePath.trim()
        )
      ),
    ];

    const results =
      await Promise.allSettled(
        uniqueImagePaths.map(
          (
            imagePath
          ) =>
            deleteUploadedImage(
              imagePath
            )
        )
      );

    const deleted =
      results.filter(
        (
          result
        ) =>
          result.status ===
            "fulfilled" &&
          result.value ===
            true
      ).length;

    return {
      requested:
        uniqueImagePaths.length,

      deleted,
    };
  };

/* =========================================================
   EXPORTED DIRECTORY PATHS
   ========================================================= */

export const imageUploadPaths = {
  projectRoot,
  publicDirectory,

  riskUploadDirectory,
  beforeUploadDirectory,
  afterUploadDirectory,

  userUploadDirectory,
  avatarUploadDirectory,
};