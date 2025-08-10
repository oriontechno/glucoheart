import { faker } from '@faker-js/faker';
import { matchSorter } from 'match-sorter';
import { fakeUsers } from './users'; // Import existing users mock

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Define the shape of Discussion Thread data
export type DiscussionThread = {
  id: string; // UUID (PK)
  user_id: string; // UUID (FK) - Pembuat thread
  title: string; // VARCHAR - Judul/topik
  content: string; // TEXT - Isi pembahasan awal
  created_at: string; // TIMESTAMP - Waktu dibuat
};

// Mock discussion threads data store
export const fakeDiscussionThreads = {
  records: [] as DiscussionThread[], // Holds the list of discussion thread objects

  // Initialize with sample data
  initialize() {
    const sampleDiscussionThreads: DiscussionThread[] = [];

    // Ensure users are initialized first
    if (fakeUsers.records.length === 0) {
      fakeUsers.initialize();
    }

    function generateRandomDiscussionThreadData(id: number): DiscussionThread {
      // Use deterministic seed for consistent data
      faker.seed(id * 200);

      // Get a random user from existing users
      const randomUser = faker.helpers.arrayElement(fakeUsers.records);

      // Generate thread topics related to health discussions
      const healthTopics = [
        'Tips mengelola hipertensi di usia muda',
        'Pengalaman diet untuk penderita diabetes',
        'Olahraga yang aman untuk jantung',
        'Cara mengatasi stress yang memicu hipertensi',
        'Makanan sehat untuk mencegah kardiovaskular',
        'Pengalaman kontrol gula darah',
        'Tips tidur berkualitas untuk kesehatan jantung',
        'Konsultasi obat hipertensi',
        'Sharing pengalaman check-up rutin',
        'Tips motivasi hidup sehat',
        'Mengatasi komplikasi diabetes',
        'Olahraga ringan untuk pemula',
        'Resep makanan rendah garam',
        'Cara baca hasil lab dengan benar',
        'Support group untuk penderita kronis'
      ];

      const randomTitle = faker.helpers.arrayElement(healthTopics);

      return {
        id: `thread-${id.toString().padStart(3, '0')}`, // Consistent ID format
        user_id: randomUser.id, // Take from existing users
        title: randomTitle,
        content: faker.lorem.paragraphs(
          faker.number.int({ min: 2, max: 4 }),
          '\n\n'
        ),
        created_at: faker.date
          .between({ from: '2023-01-01', to: '2024-12-31' })
          .toISOString()
      };
    }

    // Generate sample records
    for (let i = 1; i <= 20; i++) {
      sampleDiscussionThreads.push(generateRandomDiscussionThreadData(i));
    }

    this.records = sampleDiscussionThreads;

    // Reset faker seed to ensure other parts aren't affected
    faker.seed();
  },

  // Get all discussion threads with optional filtering and search
  async getAll({
    user_ids = [],
    search
  }: {
    user_ids?: string[];
    search?: string;
  }) {
    let discussionThreads = [...this.records];

    // Filter threads based on selected user IDs
    if (user_ids.length > 0) {
      discussionThreads = discussionThreads.filter((thread) =>
        user_ids.includes(thread.user_id)
      );
    }

    // Search functionality across multiple fields
    if (search) {
      discussionThreads = matchSorter(discussionThreads, search, {
        keys: ['title', 'content']
      });
    }

    return discussionThreads;
  },

  // Get paginated results with optional filtering and search
  async getDiscussionThreads({
    page = 1,
    limit = 10,
    user_ids,
    search,
    sort
  }: {
    page?: number;
    limit?: number;
    user_ids?: string;
    search?: string;
    sort?: string;
  }) {
    await delay(1000);

    const userIdsArray = user_ids ? user_ids.split('.') : [];
    let allDiscussionThreads = await this.getAll({
      user_ids: userIdsArray,
      search
    });

    // Handle sorting
    if (sort) {
      try {
        const sortingParams = JSON.parse(sort);
        if (Array.isArray(sortingParams) && sortingParams.length > 0) {
          allDiscussionThreads.sort((a, b) => {
            for (const sortParam of sortingParams) {
              const { id, desc } = sortParam;
              const aValue = a[id as keyof DiscussionThread];
              const bValue = b[id as keyof DiscussionThread];

              if (aValue === null || aValue === undefined) return desc ? -1 : 1;
              if (bValue === null || bValue === undefined) return desc ? 1 : -1;

              let comparison = 0;
              if (typeof aValue === 'string' && typeof bValue === 'string') {
                // Special handling for date strings
                if (id === 'created_at') {
                  const aDate = new Date(aValue);
                  const bDate = new Date(bValue);
                  comparison = aDate.getTime() - bDate.getTime();
                } else {
                  comparison = aValue.localeCompare(bValue);
                }
              } else {
                comparison = String(aValue).localeCompare(String(bValue));
              }

              if (comparison !== 0) {
                return desc ? -comparison : comparison;
              }
            }
            return 0;
          });
        }
      } catch (error) {
        console.warn('Invalid sort parameter:', sort);
      }
    }

    const totalDiscussionThreads = allDiscussionThreads.length;

    // Pagination logic
    const offset = (page - 1) * limit;
    const paginatedDiscussionThreads = allDiscussionThreads.slice(
      offset,
      offset + limit
    );

    // Add user information to each thread
    const discussionThreadsWithUsers = paginatedDiscussionThreads.map(
      (thread) => {
        const user = fakeUsers.records.find((u) => u.id === thread.user_id);
        return {
          ...thread,
          user: user
            ? {
                id: user.id,
                name: user.name,
                email: user.email
              }
            : null
        };
      }
    );

    // Mock current time
    const currentTime = new Date().toISOString();

    // Return paginated response
    return {
      success: true,
      time: currentTime,
      message:
        'Sample discussion threads data for testing and learning purposes',
      totalDiscussionThreads: totalDiscussionThreads,
      offset,
      limit,
      discussionThreads: discussionThreadsWithUsers
    };
  },

  // Get a specific discussion thread by ID
  async getDiscussionThreadById(id: string) {
    await delay(1000); // Simulate a delay

    // Find the thread by ID
    const discussionThread = this.records.find((thread) => thread.id === id);

    if (!discussionThread) {
      return {
        success: false,
        message: `Discussion thread with ID ${id} not found`
      };
    }

    // Add user information
    const user = fakeUsers.records.find(
      (u) => u.id === discussionThread.user_id
    );
    const discussionThreadWithUser = {
      ...discussionThread,
      user: user
        ? {
            id: user.id,
            name: user.name,
            email: user.email
          }
        : null
    };

    // Mock current time
    const currentTime = new Date().toISOString();

    return {
      success: true,
      time: currentTime,
      message: `Discussion thread with ID ${id} found`,
      discussionThread: discussionThreadWithUser
    };
  },

  // Get threads by user ID
  async getDiscussionThreadsByUserId(userId: string) {
    await delay(500);

    const userDiscussionThreads = this.records.filter(
      (thread) => thread.user_id === userId
    );

    return {
      success: true,
      time: new Date().toISOString(),
      message: `Found ${userDiscussionThreads.length} threads for user ${userId}`,
      discussionThreads: userDiscussionThreads
    };
  }
};

// Initialize sample discussion threads
fakeDiscussionThreads.initialize();
