// routes/jobs.js
const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const User = require('../models/User');
const Transaction = require('../models/Transaction');


// Job Posting Route
router.post('/post', async (req, res) => {
    try {
        const { title, minSalary, maxSalary, location } = req.body;

        // Check if the user is a company
        const user = await User.findById(req.userId);
        if (!user || user.role !== 'company') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Calculate required Rupees
        const requiredRupees = title.length + minSalary.length + maxSalary.length + location.length;

        // Check if the company has enough Rupees
        if (user.balance < requiredRupees) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Deduct required Rupees from the company's balance
        user.balance -= requiredRupees;
        await user.save();

        // Create a new job posting
        const job = new Job({
            title,
            minSalary,
            maxSalary,
            location,
            company: req.userId
        });

        // Save the job posting to the database
        await job.save();

        res.status(200).json({ message: 'Job posted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// Job Application Route
router.post('/apply', async (req, res) => {
    try {
        const { jobId } = req.body;

        // Check if the user is a student
        const user = await User.findById(req.userId);
        if (!user || user.role !== 'student') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Find the job by ID
        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        // Calculate required Rupees
        const requiredRupees = calculateRequiredRupees(job);

        // Check if the student has enough Rupees
        if (user.balance < requiredRupees) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Deduct required Rupees from the student's balance
        user.balance -= requiredRupees;
        await user.save();

        // Credit half of the required Rupees to the company's balance
        const company = await User.findById(job.company);
        company.balance += requiredRupees / 2;
        await company.save();

        // Record transaction history for the student
        const studentTransaction = new Transaction({
            userId: req.userId,
            type: 'debit',
            amount: requiredRupees,
            timestamp: new Date()
        });
        await studentTransaction.save();

        // Record transaction history for the company
        const companyTransaction = new Transaction({
            userId: job.company,
            type: 'credit',
            amount: requiredRupees / 2,
            timestamp: new Date()
        });
        await companyTransaction.save();

        res.status(200).json({ message: 'Job application successful' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Function to calculate required Rupees for job application
function calculateRequiredRupees(job) {
    const { title, minSalary, maxSalary, location } = job;
    return title.length + minSalary.toString().length + maxSalary.toString().length + location.length;
}


module.exports = router;
