const express = require('express')
const pool = require('./database')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const cors = require('cors')
require('dotenv').config()

const app = express()
app.use(cors())
app.use(express.json())

const port = 4000

app.get('/', (req, res) => res.send('Hello World!'))

app. post('/register', async (req, res) => {
    const { email, password, name } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        const [result] = await pool.query('INSERT INTO users (email, password, name) VALUES (?, ?, ?)', [email, hashedPassword, name]);
        res.status(201).send('Uesr registerd');
    } catch (error) {
    res.status(500).send('Error register');
    };
});
app.post('/addnew', async (req, res) => {
    const { fname, lname } = req.body;

    // ตรวจสอบข้อมูลพนักงานที่มีอยู่แล้วในฐานข้อมูล
    const [results] = await pool.query('SELECT * FROM employees WHERE fname = ?', [fname]);
    let employee = results[0];

    // ถ้าพนักงานไม่พบในฐานข้อมูล ให้เพิ่มข้อมูลพนักงานใหม่
    if (!employee) {
        await pool.query('INSERT INTO employees (fname, lname) VALUES (?, ?)', [fname, lname]);
        // ดึงข้อมูลพนักงานที่เพิ่มใหม่ออกมา
        const [newResults] = await pool.query('SELECT * FROM employees WHERE fname = ?', [fname]);
        employee = newResults[0];
    }

    // ตรวจสอบการเปรียบเทียบรหัสผ่าน
    if (await bcrypt.compare(lname, employee.lname)) {
        const accessToken = jwt.sign({ id: employee.id, fname: employee.fname },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '20h' }
        );
        return res.json({ token: accessToken });
    } else {
        return res.status(401).json({ message: 'เพิ่มข้อมูลสำเร็จ' });
    }
    
});
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const [results] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = results[0];
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }
    if (await bcrypt.compare(password, user.password)) {
        const accessToken = jwt.sign({ id: user.id, email: user.email },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '20h' }
        );
        return res.json({ token: accessToken });
    } else {
        return res.status(401).json({ message: 'Password incorrect' });
    }

});
app.listen(port, () => console.log(`Example app listening on port ${port}!`));