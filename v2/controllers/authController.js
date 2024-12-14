const bcrypt = require('bcryptjs')

const pool = require('../config/DB')

const register = async (req, res) => {
    const { email, password, role, name } = req.body;

    if(!email || !password || !role || !name){
        console.log("Please Enter some credentials")
        return res.status(404).send("Please Enter some credentials")
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
         await pool.query('INSERT INTO users (email, password, role,name) VALUES ($1, $2, $3,$4) RETURNING *', [email, hashedPassword, role,name]);
        res.status(201).json({message: "User registered successfully"});
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}

const login = async (req, res) => { 
    const { email, password } = req.body;
    if(!email || !password){
        console.log("Please Enter some credentials")
        return res.status(404).send("Please Enter some credentials")
    }   
    try {
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (!user.rows.length){
            console.log("User not found");
            return res.status(404).json({ message: 'User not found' });
        }
        const isPasswordCorrect = await bcrypt.compare(password, user.rows[0].password);
        if (!isPasswordCorrect){
            console.log("Invalid password");
            return res.status(401).json({ message: 'Invalid password' });
        }
        res.json({ message: 'Login successful', user: user.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}

module.exports = {
    register,
    login
}