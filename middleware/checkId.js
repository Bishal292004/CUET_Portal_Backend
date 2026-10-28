export function checkId(req, res, next, id) {
  if (!/^[a-f\d]{24}$/i.test(id)) {
    return res.status(400).json({ success: false, message: "Invalid ID format." });
  }
  next();
}