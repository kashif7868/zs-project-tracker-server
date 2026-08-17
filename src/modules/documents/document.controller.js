import {
  deleteDocumentService,
  generateDocumentService,
  getDocumentByIdService,
  getDocumentDownloadService,
  getDocumentsService,
  getProjectDocumentsService,
} from "./document.service.js";

/* =========================================================
   RESPONSE HELPER
   ========================================================= */

const sendSuccessResponse = (
  res,
  statusCode,
  message,
  data = {}
) => {
  return res
    .status(statusCode)
    .json({
      success: true,
      message,
      data,
    });
};

/* =========================================================
   DOWNLOAD FILE NAME HELPER

   Service already provides the client-facing file name.

   This helper only adds a safe fallback so downloads never
   fall back to an undefined or generic Express name.
   ========================================================= */

const getDownloadFileName = (
  document
) => {
  const fileName =
    typeof document?.fileName ===
      "string"
      ? document.fileName.trim()
      : "";

  if (fileName) {
    return fileName;
  }

  const format =
    typeof document?.format ===
      "string"
      ? document.format
          .trim()
          .toLowerCase()
      : "pdf";

  const title =
    typeof document?.title ===
      "string"
      ? document.title.trim()
      : typeof document?.projectTitle ===
          "string"
        ? document.projectTitle.trim()
        : typeof document?.projectCode ===
            "string"
          ? document.projectCode.trim()
          : "project-report";

  const safeTitle =
    title
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      )
      .slice(
        0,
        100
      ) ||
    "project-report";

  return `${safeTitle}.${format}`;
};

/* =========================================================
   GENERATE DOCUMENT

   POST /api/v1/documents/generate

   Existing Task Register se data export hoga.

   Task records duplicate create nahi honge.

   Generated PDF / DOCX / XLSX file aur uski history save hogi.
   ========================================================= */

export const generateDocument =
  async (
    req,
    res,
    next
  ) => {
    try {
      const result =
        await generateDocumentService(
          req.body,
          req.user
        );

      return sendSuccessResponse(
        res,
        201,
        "Document generated successfully.",
        result
      );
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   GET DOCUMENT HISTORY

   GET /api/v1/documents
   ========================================================= */

export const getDocuments =
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        projectId,
        search,
        layout,
        format,
        status,
        generatedBy,
        dateFrom,
        dateTo,
        page,
        limit,
        sortBy,
        sortOrder,
      } = req.query ?? {};

      const result =
        await getDocumentsService({
          projectId,
          search,
          layout,
          format,
          status,
          generatedBy,
          dateFrom,
          dateTo,
          page,
          limit,
          sortBy,
          sortOrder,
        });

      return sendSuccessResponse(
        res,
        200,
        "Document history retrieved successfully.",
        result
      );
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   GET PROJECT DOCUMENT HISTORY

   GET /api/v1/documents/project/:projectId
   ========================================================= */

export const getProjectDocuments =
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        search,
        layout,
        format,
        status,
        generatedBy,
        dateFrom,
        dateTo,
        page,
        limit,
        sortBy,
        sortOrder,
      } = req.query ?? {};

      const result =
        await getProjectDocumentsService(
          req.params.projectId,
          {
            search,
            layout,
            format,
            status,
            generatedBy,
            dateFrom,
            dateTo,
            page,
            limit,
            sortBy,
            sortOrder,
          }
        );

      return sendSuccessResponse(
        res,
        200,
        "Project document history retrieved successfully.",
        result
      );
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   GET SINGLE DOCUMENT HISTORY RECORD

   GET /api/v1/documents/:documentId
   ========================================================= */

export const getDocumentById =
  async (
    req,
    res,
    next
  ) => {
    try {
      const result =
        await getDocumentByIdService(
          req.params.documentId
        );

      return sendSuccessResponse(
        res,
        200,
        "Document retrieved successfully.",
        result
      );
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   DOWNLOAD GENERATED DOCUMENT

   GET /api/v1/documents/:documentId/download

   Only completed documents download ho sakte hain.

   The public/client-facing download name comes from the
   generated document record, while the physical stored file
   may have a timestamp/hash to prevent overwriting history.
   ========================================================= */

export const downloadDocument =
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        document,
        absoluteFilePath,
      } =
        await getDocumentDownloadService(
          req.params.documentId
        );

      const downloadFileName =
        getDownloadFileName(
          document
        );

      if (document.mimeType) {
        res.setHeader(
          "Content-Type",
          document.mimeType
        );
      }

      /*
        Avoid browser/proxy caching an old generated report
        under a previous file name.
      */

      res.setHeader(
        "Cache-Control",
        "private, no-store, no-cache, must-revalidate"
      );

      res.setHeader(
        "Pragma",
        "no-cache"
      );

      res.setHeader(
        "Expires",
        "0"
      );

      return res.download(
        absoluteFilePath,
        downloadFileName,
        {
          headers: {
            "X-Content-Type-Options":
              "nosniff",
          },
        },
        (error) => {
          if (!error) {
            return;
          }

          /*
            Download start hone ke baad response headers already
            send ho sakte hain. Aisi condition mein second JSON
            response nahi bhejna chahiye.
          */

          if (res.headersSent) {
            console.error(
              "Document download failed after response started:",
              error
            );

            return;
          }

          next(error);
        }
      );
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   DELETE DOCUMENT HISTORY AND GENERATED FILE

   DELETE /api/v1/documents/:documentId

   Deletes:

   - generated PDF, DOCX or XLSX file
   - Documents History database record

   Original Project, Task Register aur Evidence records
   delete nahi honge.
   ========================================================= */

export const deleteDocument =
  async (
    req,
    res,
    next
  ) => {
    try {
      const result =
        await deleteDocumentService(
          req.params.documentId
        );

      return sendSuccessResponse(
        res,
        200,
        "Document history and generated file deleted successfully.",
        result
      );
    } catch (error) {
      return next(error);
    }
  };
