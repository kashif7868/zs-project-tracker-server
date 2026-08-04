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
   UPLOAD LIMITS

   Maximum:
   - 10 images per request
   - 10 MB per image
   ========================================================= */

export const MAX_EVIDENCE_IMAGES = 10;

export const MAX_EVIDENCE_IMAGE_SIZE =
  10 * 1024 * 1024;

/* =========================================================
   ALLOWED IMAGE TYPES

   Sirf:

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

const ALLOWED_IMAGE_MIME_TYPES = new Set(
  Object.keys(
    IMAGE_MIME_EXTENSION_MAP
  )
);

/* =========================================================
   CREATE UPLOAD DIRECTORIES

   Automatically creates:

   public/
   └── uploads/
       └── risks/
           ├── before/
           └── after/
   ========================================================= */

const createUploadDirectories = () => {
  const directories = [
    publicDirectory,
    riskUploadDirectory,
    beforeUploadDirectory,
    afterUploadDirectory,
  ];

  directories.forEach((directory) => {
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, {
        recursive: true,
      });
    }
  });
};

createUploadDirectories();

/* =========================================================
   IMAGE FILE FILTER
   ========================================================= */

const evidenceImageFilter = (
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

    return callback(error, false);
  }

  return callback(null, true);
};

/* =========================================================
   SAFE IMAGE FILE NAME

   Examples:

   before-RISK_ID-1720000000000-UUID.jpg

   after-RISK_ID-1720000000000-UUID.png
   ========================================================= */

const createImageFileName = (
  req,
  file,
  evidenceType
) => {
  const extension =
    IMAGE_MIME_EXTENSION_MAP[
      file.mimetype
    ];

  const riskId =
    typeof req.params?.riskId ===
    "string"
      ? req.params.riskId.replace(
          /[^a-zA-Z0-9_-]/g,
          ""
        )
      : "risk";

  const uniqueId = crypto
    .randomUUID()
    .replaceAll("-", "");

  return [
    evidenceType,
    riskId,
    Date.now(),
    uniqueId,
  ].join("-") + extension;
};

/* =========================================================
   STORAGE FACTORY
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
      callback(null, destination);
    },

    filename(
      req,
      file,
      callback
    ) {
      const filename =
        createImageFileName(
          req,
          file,
          evidenceType
        );

      callback(null, filename);
    },
  });
};

/* =========================================================
   BEFORE IMAGE UPLOADER
   ========================================================= */

const beforeEvidenceMulter = multer({
  storage:
    createEvidenceStorage("before"),

  fileFilter: evidenceImageFilter,

  limits: {
    fileSize:
      MAX_EVIDENCE_IMAGE_SIZE,

    files:
      MAX_EVIDENCE_IMAGES,
  },
});

/* =========================================================
   AFTER IMAGE UPLOADER
   ========================================================= */

const afterEvidenceMulter = multer({
  storage:
    createEvidenceStorage("after"),

  fileFilter: evidenceImageFilter,

  limits: {
    fileSize:
      MAX_EVIDENCE_IMAGE_SIZE,

    files:
      MAX_EVIDENCE_IMAGES,
  },
});

/* =========================================================
   UPLOAD MIDDLEWARE

   multipart/form-data field name:

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
   REQUEST FILE HELPER
   ========================================================= */

const getRequestFiles = (req) => {
  if (Array.isArray(req.files)) {
    return req.files;
  }

  if (req.file) {
    return [req.file];
  }

  if (
    req.files &&
    typeof req.files === "object"
  ) {
    return Object.values(
      req.files
    ).flat();
  }

  return [];
};

/* =========================================================
   CLEAN FAILED UPLOADS

   Multer upload fail ho to temporary uploaded images
   delete hongi.
   ========================================================= */

const cleanupFailedUpload =
  async (req) => {
    const files =
      getRequestFiles(req);

    await Promise.allSettled(
      files.map(async (file) => {
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
            error?.code !== "ENOENT"
          ) {
            console.error(
              "Failed image cleanup:",
              error
            );
          }
        }
      })
    );
  };

/* =========================================================
   MULTER ERROR HANDLER
   ========================================================= */

export const handleEvidenceUpload = (
  uploadMiddleware
) => {
  return (req, res, next) => {
    uploadMiddleware(
      req,
      res,
      async (error) => {
        if (!error) {
          return next();
        }

        await cleanupFailedUpload(req);

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
                  "Each evidence image must be 10 MB or smaller.",
              });
          }

          if (
            error.code ===
            "LIMIT_FILE_COUNT"
          ) {
            return res
              .status(400)
              .json({
                success: false,
                message:
                  "Maximum 10 evidence images can be uploaded at one time.",
              });
          }

          if (
            error.code ===
            "LIMIT_UNEXPECTED_FILE"
          ) {
            return res
              .status(400)
              .json({
                success: false,
                message:
                  'Evidence images must be uploaded using the field name "images".',
              });
          }

          return res
            .status(400)
            .json({
              success: false,
              message:
                error.message ||
                "Evidence image upload failed.",
            });
        }

        if (
          error?.statusCode === 400
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
   GET PUBLIC IMAGE PATHS

   Physical path:

   D:/backend/public/uploads/risks/before/image.jpg

   Database path:

   /uploads/risks/before/image.jpg
   ========================================================= */

export const getUploadedImagePaths = (
  req
) => {
  const files =
    getRequestFiles(req);

  return [
    ...new Set(
      files
        .map((file) => {
          if (
            !file ||
            typeof file.path !==
              "string"
          ) {
            return "";
          }

          const absoluteFilePath =
            path.resolve(file.path);

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

          if (isOutsidePublic) {
            return "";
          }

          return `/${relativeFilePath.replaceAll(
            "\\",
            "/"
          )}`;
        })
        .filter(Boolean)
    ),
  ];
};

/* =========================================================
   DELETE ONE UPLOADED IMAGE
   ========================================================= */

export const deleteUploadedImage =
  async (imagePath) => {
    if (
      typeof imagePath !== "string" ||
      !imagePath.trim()
    ) {
      return false;
    }

    if (
      imagePath.startsWith("http://") ||
      imagePath.startsWith("https://")
    ) {
      return false;
    }

    const cleanImagePath = imagePath
      .trim()
      .replaceAll("\\", "/")
      .replace(/^\/+/, "");

    const absoluteImagePath =
      path.resolve(
        publicDirectory,
        cleanImagePath
      );

    const relativeRiskPath =
      path.relative(
        riskUploadDirectory,
        absoluteImagePath
      );

    const isOutsideRiskDirectory =
      relativeRiskPath.startsWith(
        ".."
      ) ||
      path.isAbsolute(
        relativeRiskPath
      );

    if (isOutsideRiskDirectory) {
      return false;
    }

    try {
      await fs.promises.unlink(
        absoluteImagePath
      );

      return true;
    } catch (error) {
      if (error?.code === "ENOENT") {
        return false;
      }

      console.error(
        "Evidence image deletion failed:",
        error
      );

      return false;
    }
  };

/* =========================================================
   DELETE MULTIPLE UPLOADED IMAGES
   ========================================================= */

export const deleteUploadedImages =
  async (imagePaths = []) => {
    if (!Array.isArray(imagePaths)) {
      return {
        requested: 0,
        deleted: 0,
      };
    }

    const uniqueImagePaths = [
      ...new Set(
        imagePaths.filter(
          (imagePath) =>
            typeof imagePath ===
              "string" &&
            imagePath.trim()
        )
      ),
    ];

    const results =
      await Promise.allSettled(
        uniqueImagePaths.map(
          (imagePath) =>
            deleteUploadedImage(
              imagePath
            )
        )
      );

    const deleted = results.filter(
      (result) =>
        result.status ===
          "fulfilled" &&
        result.value === true
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
};