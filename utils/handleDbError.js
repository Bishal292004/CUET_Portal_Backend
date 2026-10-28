export function handleDbError(error, res, duplicateMessage) {
  if (error.code === 11000) {
    res.status(409).json({ success: false, message: duplicateMessage });
    return true;
  }
  if (error.name === "ValidationError") {
    res.status(400).json({ success: false, message: "Invalid data provided." });
    return true;
  }
  return false;
}