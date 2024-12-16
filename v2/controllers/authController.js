const bcrypt = require('bcryptjs')

const pool = require('../config/DB')

const register = async (req, res) => {
    const { email, password, role, username, preferences } = req.body;

    console.log(`Email: ${email} Password: ${password} Role: ${role} Username: ${username} Preferences: ${preferences}`)

    if(!email || !password || !role || !username || !preferences){
        console.log("Please Enter some credentials")
        return res.status(404).send("Please Enter some credentials")
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        let newUser = await pool.query('INSERT INTO users (email, password, role,name) VALUES ($1, $2, $3,$4) RETURNING *', [email, hashedPassword, role,username]);
        newUser = {
            id: newUser.rows[0].id,
            email: newUser.rows[0].email,
            role: newUser.rows[0].role,
            username: newUser.rows[0].name,
            preferences: newUser.rows[0].preferences
        }
        res.status(201).json({message: "User registered successfully", user: newUser});
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