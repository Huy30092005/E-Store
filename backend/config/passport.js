import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import userModel from "../models/userModel.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:4000/api/user/auth/google/callback",
      
    },
    async (accessToken, refreshToken, profile, done) => {

      console.log("=== Strategy Hit ===");   // if this never prints, code exchange failed
      console.log("Profile ID:", profile.id);
      try {
        const email = profile.emails[0].value;
        let user = await userModel.findOne({ email });

       
        if (!user) {
          user = await userModel.create({
            name: profile.displayName,
            email,
            provider: "google",
            providerId: profile.id,
            role: "customer",
          });
        } else if (user.provider !== "google") {
          return done(null, false, {
            message: "Email already registered. Please log in with your password.",
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);


export default passport;