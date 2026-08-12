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

      if (document.mimeType) {
        res.setHeader(
          "Content-Type",
          document.mimeType
        );
      }

      return res.download(
        absoluteFilePath,
        document.fileName,
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
