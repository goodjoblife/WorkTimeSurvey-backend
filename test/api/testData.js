const { ObjectId } = require('mongodb');

function generateInterviewExperienceData() {
    const interview_experience_data = {
        type: 'interview',
        created_at: new Date(),
        author_id: new ObjectId(),
        region: "臺北市",
        job_title: 'job_title_example',
        title: "title_example",
        company: {
            id: '111',
            name: 'goodjob',
        },
        sections: [{
            subtitle: "subtitle1",
            content: "content1",
        }],
        experience_in_year: 10,
        education: "大學",
        // Interview Experience related
        interview_time: {
            year: 2017,
            month: 3,
        },
        interview_qas: [{
            question: "qas1",
            answer: "ans1",
        }],
        interview_sensitive_questions: [
            'You are so handsome ~',
        ],
        interview_result: "up",
        salary: {
            type: 'year',
            amount: 10000,
        },
        overall_rating: 5,
        like_count: 0,
        reply_count: 0,
        report_count: 0,
        status: 'published',
    };

    return interview_experience_data;
}


function generateWorkExperienceData() {
    const work_experience_data = {
        type: 'work',
        created_at: new Date(),
        author_id: new ObjectId(),
        region: "臺北市",
        job_title: 'job_title_example',
        title: "title_example",
        company: {
            id: '111',
            name: 'goodjob',
        },
        sections: [{
            subtitle: "subtitle1",
            content: "content1",
        }],
        experience_in_year: 10,
        education: "大學",
        like_count: 0,
        reply_count: 0,
        report_count: 0,
        status: 'published',
        is_currently_employed: 'no',
        job_ending_time: {
            year: 2017,
            month: 10,
        },
        salary: {
            type: 'year',
            amount: 100000,
        },
        week_work_time: 40,
        data_time: {
            year: 2017,
            month: 10,
        },
        recommend_to_others: 'yes',
    };

    return work_experience_data;
}

module.exports = {
    generateInterviewExperienceData,
    generateWorkExperienceData,
};
