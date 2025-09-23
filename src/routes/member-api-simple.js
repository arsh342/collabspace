const express = require('express');
const router = express.Router();
const { authenticateSession } = require('../middleware/auth');
const User = require('../models/User');
const Team = require('../models/Team');
const Task = require('../models/Task');

// Simple test route
router.get('/test', (req, res) => {
    res.json({ message: 'Member API working' });
});

// Member Dashboard Stats
router.get('/stats', authenticateSession, async (req, res) => {
    try {
        const userId = req.session.userId;
        
        // Get user's teams
        const userTeams = await Team.find({
            members: userId
        }).select('_id');
        
        const teamIds = userTeams.map(team => team._id);
        
        // Get member tasks (tasks in their teams)
        const memberTasks = await Task.find({
            team: { $in: teamIds },
            isArchived: false
        });
        
        // Get completed tasks
        const completedTasks = memberTasks.filter(task => task.status === 'completed');
        
        const stats = {
            myTasks: memberTasks.length,
            completedTasks: completedTasks.length,
            myTeams: userTeams.length,
            unreadMessages: 0 // Simplified for now
        };
        
        console.log('Member stats calculated:', stats);
        res.json(stats);
        
    } catch (error) {
        console.error('Error fetching member stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

// Get member tasks
router.get('/tasks', authenticateSession, async (req, res) => {
    try {
        const userId = req.session.userId;
        
        // Get user's teams
        const userTeams = await Team.find({
            members: userId
        }).select('_id');
        
        const teamIds = userTeams.map(team => team._id);
        
        // Get member tasks
        const tasks = await Task.find({
            team: { $in: teamIds },
            isArchived: false
        })
        .populate('team', 'name')
        .populate('assignedTo', 'firstName lastName')
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: -1 });
        
        res.json(tasks);
        
    } catch (error) {
        console.error('Error fetching member tasks:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

// Get member teams
router.get('/teams', authenticateSession, async (req, res) => {
    try {
        const userId = req.session.userId;
        
        const teams = await Team.find({
            members: userId
        })
        .populate('admin', 'firstName lastName email')
        .populate('members', 'firstName lastName email')
        .sort({ createdAt: -1 });
        
        res.json(teams);
        
    } catch (error) {
        console.error('Error fetching member teams:', error);
        res.status(500).json({ error: 'Failed to fetch teams' });
    }
});

// Get member profile
router.get('/profile', authenticateSession, async (req, res) => {
    try {
        const userId = req.session.userId;
        
        const user = await User.findById(userId)
            .select('firstName lastName email username phone avatar bio createdAt');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(user);
        
    } catch (error) {
        console.error('Error fetching member profile:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Update member profile
router.put('/profile', authenticateSession, async (req, res) => {
    try {
        const userId = req.session.userId;
        const { firstName, lastName, phone, bio } = req.body;
        
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                firstName,
                lastName,
                phone,
                bio
            },
            { new: true, runValidators: true }
        ).select('firstName lastName email username phone avatar bio');
        
        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(updatedUser);
        
    } catch (error) {
        console.error('Error updating member profile:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

module.exports = router;