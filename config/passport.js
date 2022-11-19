const dotenv = require('dotenv')
const JwtStrategy = require('passport-jwt').Strategy
const ExtractJWT = require('passport-jwt').ExtractJwt

const User = require('../models/users')
dotenv.config()
const secret = process.env.JWT_SECRET || "Zr4u7x!A%D*G-KaPdRgUkXp2s5v8y/B?"

module.exports =  function (passport) {
    let options = {}
    options.jwtFromRequest = ExtractJWT.fromAuthHeaderAsBearerToken()
    options.secretOrKey = secret
    console.log(options)
    passport.use('user-rule',new JwtStrategy(options,(jwt_payload,done) => {
        console.log(jwt_payload)
        User.findOne({$and:[{email:jwt_payload.email},{$or:[{organization:"vitraya"},{organization:"NivaBupa"}]}]},(err,user) => {
            if(err){
                return done(err, false)
            }
            if (user) {
                done(null, user);
            } 
            else {
                done(null, false);
            }
        })
    }))
    passport.use('admin-rule',new JwtStrategy(options,(jwt_payload,done) => {
        console.log(jwt_payload)
        User.findOne({$and:[{email:jwt_payload.email},{organization:"vitraya"}]},(err,user) => {
            if(err){
                return done(err, false)
            }
            if (user) {
                done(null, user);
            } 
            else {
                done(null, false);
            }
        })
    }))
    passport.use('reg-rule',new JwtStrategy(options,(jwt_payload,done) => {
        console.log(jwt_payload)
        if (jwt_payload.organization === "vitraya") {
            done(null, true);
        } 
        else {
            done(null, false);
        }
    })) 
}
