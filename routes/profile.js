const router = require("express").Router();
const User = require("../models/User");

router.post("/", async (req, res) => {
  try {
    const { user, pregnancy, profileImage } = req.body;

    const updatedUser =
      await User.findOneAndUpdate(
        { email: user.email },
        {
          ...user,
          pregnancy,
          profileImage
        },
        { new: true, upsert: true }
      );

    res.json(updatedUser);

  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;