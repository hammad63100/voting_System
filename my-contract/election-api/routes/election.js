const express = require('express');
const {Web3} = require('web3');
const router = express.Router();
// Connect to your local Ganache instance
const web3 = new Web3('http://127.0.0.1:7545');

const ElectionSystem = require('../../build/contracts/ElectionSystem.json');
const contractAddress = '0xBEE7E421ff2B3E61260a8f2bA3DA360faC7B132E';

const electionContract = new web3.eth.Contract(ElectionSystem.abi, contractAddress);
const contract = new web3.eth.Contract(ElectionSystem.abi, contractAddress);





// Middleware to handle errors
const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Utility function to handle BigInt serialization
const formatBigIntResponse = (obj) => {
    if (typeof obj !== 'object' || obj === null) {
        if (typeof obj === 'bigint') {
            return Number(obj);
        }
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(formatBigIntResponse);
    }

    const formatted = {};
    for (const [key, value] of Object.entries(obj)) {
        formatted[key] = formatBigIntResponse(value);
    }
    return formatted;
};

// Initialize contract
const initializeContract = async () => {
    try {
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = ElectionContract.networks[networkId];
      
      contract = new web3.eth.Contract(
        ElectionContract.abi,
        deployedNetwork && deployedNetwork.address
      );
      
      return contract;
    } catch (error) {
      console.error('Failed to initialize contract:', error);
      throw error;
    }
  };
  

// Middleware to ensure contract is initialized
const ensureContract = async (req, res, next) => {
    try {
      if (!contract) {
        await initializeContract();
      }
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to initialize contract",
        details: error.message
      });
    }
  };
  

// User Registration
router.post('/register', asyncHandler(async (req, res) => {
    const { name, dateOfBirth, parentName, email, mobileNo, password, cnicNumber } = req.body;
    const accounts = await web3.eth.getAccounts();
    
    const result = await electionContract.methods.registerUser(
        name,
        dateOfBirth,
        parentName,
        email,
        mobileNo,
        password,
        cnicNumber
    ).send({ from: accounts[0], gas: 3000000 });
    
    res.json({
        success: true,
        message: 'User registered successfully',
        transaction: result.transactionHash
    });
}));





// User Login
router.post('/login', asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const accounts = await web3.eth.getAccounts();
    
    const result = await electionContract.methods.login(email, password)
        .send({ from: accounts[0], gas: 3000000 });
    
    res.json({
        success: true,
        message: 'Login successful',
        transaction: result.transactionHash
    });
}));

// User Logout
router.post('/logout', asyncHandler(async (req, res) => {
    const { cnicNumber } = req.body;
    const accounts = await web3.eth.getAccounts();
    
    const result = await electionContract.methods.logout(cnicNumber)
        .send({ from: accounts[0], gas: 3000000 });
    
    res.json({
        success: true,
        message: 'Logout successful',
        transaction: result.transactionHash
    });
}));




router.get('/getUserDetailsByEmail', ensureContract, async (req, res) => {
    try {
      const { email } = req.query;
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required.',
        });
      }
  
      // Call the contract method to get user details
      const userDetails = await contract.methods.getUserDetailsByEmail(email).call();
      
      
      res.json({ success: true, ...userDetails });
      
    } catch (error) {
      console.error('Error fetching user details:', error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch user details",
        details: error.message || "An error occurred",
      });
    }
  });
  






// Add Candidate
router.post('/candidates', asyncHandler(async (req, res) => {
    const { name } = req.body;
    const accounts = await web3.eth.getAccounts();
    
    const result = await electionContract.methods.addCandidate(name)
        .send({ from: accounts[0], gas: 3000000 });
    
    res.json({
        success: true,
        message: 'Candidate added successfully',
        transaction: result.transactionHash
    });
}));





router.post('/vote', asyncHandler(async (req, res) => {
    try {
        const { candidateName } = req.body;

        // Check if candidateName is provided
        if (!candidateName) {
            return res.status(400).json({ success: false, message: 'Candidate name is required.' });
        }

        // Get accounts and check if there's at least one account available
        const accounts = await web3.eth.getAccounts();
        if (!accounts.length) {
            return res.status(500).json({ success: false, message: 'No accounts available in Web3.' });
        }

        // Execute the vote transaction
        const result = await electionContract.methods.vote(candidateName)
            .send({ from: accounts[0], gas: 3000000 });

        res.json({
            success: true,
            message: 'Vote cast successfully',
            transaction: result.transactionHash
        });
    } catch (error) {
        console.error('Error casting vote:', error);
        res.status(500).json({ success: false, message: 'Failed to cast vote. Please try again later.' });
    }
}));






// Get Election Results
router.get('/results', asyncHandler(async (req, res) => {
    try {
        const winner = await electionContract.methods.getResults().call();
        
        // Create the response object with explicit type conversions
        const response = {
            success: true,
            data: {
                winningCandidate: {
                    id: winner[0].toString(),      // Convert BigInt to string
                    voteCount: Number(winner[1]),  // Convert BigInt to Number
                    name: winner[2]                // String remains as is
                }
            }
        };

        // Additional safety: Serialize any remaining BigInt values
        const safeResponse = JSON.parse(JSON.stringify(response, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        res.json(safeResponse);
    } catch (error) {
        console.error('Error getting election results:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch election results'
        });
    }
}));




router.get('/candidate/:id', async (req, res) => {
    const candidateId = req.params.id;

    try {
        // Call the getCandidate function from your smart contract
        const candidate = await electionContract.methods.getCandidate(candidateId).call();
        
        // Convert the BigInt voteCount to a number
        const candidateDetails = {
            id: candidateId,
            address: candidate[0],
            voteCount: Number(candidate[1]), // Convert BigInt to number
            name: candidate[2],
        };

        res.status(200).json(candidateDetails);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while fetching candidate details' });
    }
});




router.get('/candidates', async (req, res) => {
    try {
        const totalCandidates = await electionContract.methods.getTotalCandidates().call(); 
        const candidates = [];

        for (let i = 1; i <= totalCandidates; i++) {
            const candidate = await electionContract.methods.getCandidate(i).call();
            candidates.push({
                id: i,
                address: candidate[0],
                voteCount: Number(candidate[1]),
                name: candidate[2],
            });
        }

        res.status(200).json(candidates);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while fetching candidates' });
    }
});


module.exports = router;