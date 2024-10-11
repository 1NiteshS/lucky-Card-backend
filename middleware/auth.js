// middleware/auth.js
import jwt from 'jsonwebtoken';
import SuperAdmin from '../models/SuperAdmin.js';

export const authSuperAdmin = async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const superAdmin = await SuperAdmin.findById(decoded._id);
    
    if (!superAdmin) {
      throw new Error();
    }
    
    req.superAdmin = superAdmin;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).send({ error: 'Please authenticate as Super Admin' });
  }
};